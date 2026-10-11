import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, ROLES } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user || ![ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER].includes(user.role as any)) return NextResponse.json({ success: false, message: "Unauthorized access" }, { status: 403 });
    const body = await req.json();
    const room = await prisma.room.findUnique({ where: { id: params.id }, include: { beds: { where: { active: true } } } });
    if (!room || !room.active) return NextResponse.json({ success: false, message: "Active room not found" }, { status: 404 });
    const capacity = body.capacity === undefined ? room.capacity : Number(body.capacity);
    const floor = body.floor === undefined ? room.floor : Number(body.floor);
    const isAC = body.isAC === undefined ? room.isAC : body.isAC;
    const roomNumber = body.roomNumber === undefined ? room.roomNumber : String(body.roomNumber).trim();
    const rateCategory = body.rateCategory === "DISCOUNTED" && capacity === 2 ? "DISCOUNTED" : "STANDARD";
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 4) return NextResponse.json({ success: false, message: "Room sharing must be between 1 and 4 beds." }, { status: 400 });
    if (!Number.isInteger(floor) || floor < 1 || floor > 20) return NextResponse.json({ success: false, message: "Floor must be between 1 and 20." }, { status: 400 });
    if (typeof isAC !== "boolean" || !roomNumber) return NextResponse.json({ success: false, message: "Enter a room number and AC option." }, { status: 400 });
    const duplicate = await prisma.room.findFirst({ where: { hostelId: room.hostelId, roomNumber, id: { not: room.id } } });
    if (duplicate) return NextResponse.json({ success: false, message: "That room number is already in use in this hostel." }, { status: 409 });
    const activeStay = await prisma.residentStay.findFirst({ where: { roomId: room.id, status: "ACTIVE" } });
    if (capacity < room.beds.length) {
      const reduceBy = room.beds.length - capacity;
      const removable = room.beds.filter((bed) => bed.status === "AVAILABLE" && !bed.currentOccupantId).slice(-reduceBy);
      if (removable.length < reduceBy || activeStay) return NextResponse.json({ success: false, message: "Cannot reduce a room while a bed is occupied or unavailable. Vacate or clear the beds first." }, { status: 409 });
      const stay = await prisma.residentStay.findFirst({ where: { bedId: { in: removable.map((bed) => bed.id) }, status: "ACTIVE" } });
      const booking = await prisma.booking.findFirst({ where: { bedId: { in: removable.map((bed) => bed.id) }, bookingStatus: { in: ["CONFIRMED", "CHECKED_IN"] } } });
      if (stay || booking) return NextResponse.json({ success: false, message: "A selected bed has an active resident or booking." }, { status: 409 });
      await prisma.bed.updateMany({ where: { id: { in: removable.map((bed) => bed.id) } }, data: { active: false } });
    } else if (capacity > room.beds.length) {
      const names = new Set(room.beds.map((bed) => bed.bedNumber));
      const newBeds = Array.from({ length: capacity - room.beds.length }, (_, i) => {
        let n = room.beds.length + i + 1;
        while (names.has(`Bed ${n}`)) n += 1;
        names.add(`Bed ${n}`);
        return { roomId: room.id, hostelId: room.hostelId, bedNumber: `Bed ${n}`, tier: n % 2 ? "LOWER_BUNK" : "UPPER_BUNK", status: "AVAILABLE" };
      });
      await prisma.bed.createMany({ data: newBeds });
    }
    let type = await prisma.roomType.findFirst({ where: { totalBeds: capacity, active: true }, orderBy: { name: "asc" } });
    if (!type) {
      const slug = `sharing-${capacity}`;
      type = await prisma.roomType.findUnique({ where: { slug } });
      if (!type) type = await prisma.roomType.create({ data: { name: `${capacity}-Share Room`, slug, description: `Room with ${capacity} resident bed${capacity === 1 ? "" : "s"}.`, totalBeds: capacity } });
    }
    await prisma.$executeRawUnsafe("UPDATE Room SET capacity = ?, floor = ?, isAC = ?, roomNumber = ?, roomTypeId = ?, rateCategory = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?", capacity, floor, isAC ? 1 : 0, roomNumber, type.id, rateCategory, room.id);
    const updated = await prisma.room.findUnique({ where: { id: room.id } });
    if (!updated) return NextResponse.json({ success: false, message: "Room could not be loaded after the update." }, { status: 500 });
    return NextResponse.json({ success: true, message: `Room ${updated.roomNumber} updated.`, room: updated });
  } catch (error: any) {
    console.error("Room update error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to update room" }, { status: 500 });
  }
}
