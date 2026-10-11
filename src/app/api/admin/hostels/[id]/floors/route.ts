import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

type RoomMix = { capacity: number; isAC: boolean; roomCount: number };
type FloorPlan = { floorNumber: number; roomTypes: RoomMix[] };
const canEdit = [ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER];
const allMixes = () => [1, 2, 3, 4].flatMap((capacity) => [false, true].map((isAC) => ({ capacity, isAC })));

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user.role, canEdit)) return NextResponse.json({ success: false, message: "Owner access required." }, { status: 403 });
  const hostel = await prisma.hostel.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!hostel) return NextResponse.json({ success: false, message: "Hostel not found." }, { status: 404 });
  const [saved, rooms, legacy] = await Promise.all([
    prisma.$queryRaw<any[]>`SELECT floorNumber, capacity, isAC, roomCount FROM HostelFloorRoomType WHERE hostelId = ${params.id} ORDER BY floorNumber, capacity, isAC`,
    prisma.room.findMany({ where: { hostelId: params.id, active: true }, select: { floor: true, capacity: true, isAC: true } }),
    prisma.$queryRaw<any[]>`SELECT floorNumber FROM HostelFloor WHERE hostelId = ${params.id} ORDER BY floorNumber`,
  ]);
  const savedFloors = new Set(saved.map((row) => Number(row.floorNumber)));
  const maxFloor = Math.max(1, ...rooms.map((room) => room.floor), ...legacy.map((row) => Number(row.floorNumber)));
  const floors: FloorPlan[] = Array.from({ length: maxFloor }, (_, index) => {
    const floorNumber = index + 1;
    const floorSaved = saved.filter((row) => Number(row.floorNumber) === floorNumber);
    const mix = allMixes().map(({ capacity, isAC }) => ({
      capacity, isAC,
      roomCount: savedFloors.has(floorNumber)
        ? Number(floorSaved.find((row) => Number(row.capacity) === capacity && Boolean(row.isAC) === isAC)?.roomCount || 0)
        : rooms.filter((room) => room.floor === floorNumber && room.capacity === capacity && room.isAC === isAC).length,
    }));
    return { floorNumber, roomTypes: mix };
  });
  return NextResponse.json({ success: true, floors });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user.role, canEdit)) return NextResponse.json({ success: false, message: "Owner access required." }, { status: 403 });
  try {
    const body = await req.json();
    if (!Array.isArray(body.floors) || body.floors.length < 1 || body.floors.length > 20) return NextResponse.json({ success: false, message: "Add between 1 and 20 floors." }, { status: 400 });
    const floors: FloorPlan[] = body.floors.map((floor: any, index: number) => ({
      floorNumber: Number(floor.floorNumber),
      roomTypes: Array.isArray(floor.roomTypes) ? floor.roomTypes.map((roomType: any) => ({ capacity: Number(roomType.capacity), isAC: roomType.isAC, roomCount: Number(roomType.roomCount) })) : [],
    }));
    const valid = floors.every((floor, index) => floor.floorNumber === index + 1 && floor.roomTypes.length === 8 &&
      floor.roomTypes.every((type) => [1, 2, 3, 4].includes(type.capacity) && typeof type.isAC === "boolean" && Number.isInteger(type.roomCount) && type.roomCount >= 0 && type.roomCount <= 100) &&
      new Set(floor.roomTypes.map((type) => `${type.capacity}:${type.isAC}`)).size === 8);
    if (!valid) return NextResponse.json({ success: false, message: "Enter a room count from 0 to 100 for each sharing type and AC option." }, { status: 400 });
    const hostel = await prisma.hostel.findFirst({ where: { id: params.id, active: true }, select: { id: true } });
    if (!hostel) return NextResponse.json({ success: false, message: "Active hostel not found." }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      const existing = await tx.room.findMany({ where: { hostelId: hostel.id }, include: { beds: { where: { active: true }, select: { id: true, status: true, currentOccupantId: true, residentStays: { where: { status: "ACTIVE" }, select: { id: true } }, bookings: { where: { bookingStatus: { in: ["CONFIRMED", "CHECKED_IN"] } }, select: { id: true } } } }, residentStays: { where: { status: "ACTIVE" }, select: { id: true } } }, orderBy: { roomNumber: "desc" } });
      const existingNumbers = new Set(existing.map((room) => room.roomNumber));
      const allFloors = [...floors];
      for (const oldFloor of Array.from(new Set(existing.filter((room) => room.active).map((room) => room.floor)))) {
        if (!allFloors.some((floor) => floor.floorNumber === oldFloor)) allFloors.push({ floorNumber: oldFloor, roomTypes: allMixes().map((type) => ({ ...type, roomCount: 0 })) });
      }
      const roomTypeIds = new Map<number, string>();
      for (const capacity of [1, 2, 3, 4]) {
        let type = await tx.roomType.findFirst({ where: { totalBeds: capacity, active: true }, orderBy: { name: "asc" } });
        if (!type) {
          const slug = `sharing-${capacity}`;
          type = await tx.roomType.findUnique({ where: { slug } });
          if (!type) type = await tx.roomType.create({ data: { name: `${capacity}-Share Room`, slug, description: `Room with ${capacity} resident bed${capacity === 1 ? "" : "s"}.`, totalBeds: capacity } });
        }
        roomTypeIds.set(capacity, type.id);
      }
      for (const floor of allFloors) {
        for (const target of floor.roomTypes) {
          const group = existing.filter((room) => room.active && room.floor === floor.floorNumber && room.capacity === target.capacity && room.isAC === target.isAC);
          if (group.length > target.roomCount) {
            const excess = group.slice(0, group.length - target.roomCount);
            if (excess.some((room) => room.residentStays.length || room.beds.some((bed) => bed.status !== "AVAILABLE" || bed.currentOccupantId || bed.residentStays.length || bed.bookings.length))) throw new Error(`ROOMS_IN_USE:${floor.floorNumber}`);
            for (const room of excess) {
              await tx.bed.updateMany({ where: { roomId: room.id }, data: { active: false } });
              await tx.room.update({ where: { id: room.id }, data: { active: false } });
            }
          }
          for (let offset = group.length; offset < target.roomCount; offset += 1) {
            let n = 1;
            let roomNumber = `${floor.floorNumber}${String(n).padStart(2, "0")}`;
            while (existingNumbers.has(roomNumber)) { n += 1; roomNumber = `${floor.floorNumber}${String(n).padStart(2, "0")}`; }
            existingNumbers.add(roomNumber);
            const room = await tx.room.create({ data: { hostelId: hostel.id, roomTypeId: roomTypeIds.get(target.capacity)!, building: "Main Wing", floor: floor.floorNumber, roomNumber, capacity: target.capacity, genderCategory: "MIXED", isAC: target.isAC, status: "ACTIVE" } });
            await tx.bed.createMany({ data: Array.from({ length: target.capacity }, (_, bedIndex) => ({ roomId: room.id, hostelId: hostel.id, bedNumber: `Bed ${bedIndex + 1}`, tier: target.capacity === 1 ? "SINGLE" : bedIndex % 2 === 0 ? "LOWER_BUNK" : "UPPER_BUNK", status: "AVAILABLE" })) });
          }
        }
      }
      await tx.$executeRawUnsafe("DELETE FROM HostelFloorRoomType WHERE hostelId = ?", hostel.id);
      for (const floor of floors) for (const type of floor.roomTypes) {
        await tx.$executeRawUnsafe("INSERT INTO HostelFloorRoomType (id, hostelId, floorNumber, capacity, isAC, roomCount, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)", randomUUID(), hostel.id, floor.floorNumber, type.capacity, type.isAC, type.roomCount);
      }
      await tx.$executeRawUnsafe("DELETE FROM HostelFloor WHERE hostelId = ?", hostel.id);
      for (const floor of floors) {
        const roomCount = floor.roomTypes.reduce((sum, item) => sum + item.roomCount, 0);
        await tx.$executeRawUnsafe("INSERT INTO HostelFloor (id, hostelId, floorNumber, roomCount, capacity, isAC, createdAt, updatedAt) VALUES (?, ?, ?, ?, 2, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)", randomUUID(), hostel.id, floor.floorNumber, roomCount);
      }
    });
    await logAuditAction({ userId: user.id, userName: user.name, action: "HOSTEL_FLOOR_LAYOUT_UPDATED", entity: "Hostel", entityId: hostel.id, newValue: floors });
    return NextResponse.json({ success: true, message: "Floor layout saved and rooms updated." });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("ROOMS_IN_USE:")) return NextResponse.json({ success: false, message: `Floor ${error.message.split(":")[1]} has rooms with residents, bookings, or unavailable beds. Clear those rooms before reducing this room type.` }, { status: 409 });
    console.error("Floor layout update error:", error);
    return NextResponse.json({ success: false, message: "Could not update the floor layout." }, { status: 500 });
  }
}
