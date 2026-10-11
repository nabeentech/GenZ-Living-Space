import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, ROLES } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();

    // Check authorization
    if (!sessionUser || ![ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER, ROLES.RECEPTIONIST].includes(sessionUser.role as any)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access" },
        { status: 403 }
      );
    }

    // Fetch all rooms with their beds
    const rooms = await prisma.room.findMany({
      include: {
        beds: true,
      },
      orderBy: [{ floor: "asc" }, { roomNumber: "asc" }],
    });

    return NextResponse.json(rooms);
  } catch (error: any) {
    console.error("Room fetch error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch rooms" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();

    // Check authorization
    if (!sessionUser || ![ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER].includes(sessionUser.role as any)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { hostelId, roomNumber, floor, genderCategory } = body;
    const capacity = Number(body.capacity);
    const floorNumber = Number(floor);
    const isAC = body.isAC === true;

    // Validate inputs
    if (!hostelId || !roomNumber?.trim?.() || !Number.isInteger(floorNumber) || floorNumber < 1 || !genderCategory || !Number.isInteger(capacity)) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!["MALE", "FEMALE", "MIXED", "PRIVATE"].includes(genderCategory)) {
      return NextResponse.json(
        { success: false, message: "Invalid gender category" },
        { status: 400 }
      );
    }

    if (capacity < 1 || capacity > 20) {
      return NextResponse.json(
        { success: false, message: "Capacity must be between 1 and 20" },
        { status: 400 }
      );
    }

    // Check if room number already exists
    const existingRoom = await prisma.room.findFirst({
      where: {
        hostelId,
        roomNumber,
      },
    });

    if (existingRoom) {
      return NextResponse.json(
        { success: false, message: "Room number already exists in this hostel" },
        { status: 400 }
      );
    }

    const hostel = await prisma.hostel.findFirst({ where: { id: hostelId, active: true }, select: { id: true } });
    if (!hostel) return NextResponse.json({ success: false, message: "Active hostel not found." }, { status: 404 });

    let roomType = await prisma.roomType.findFirst({ where: { totalBeds: capacity, active: true }, orderBy: { name: "asc" } });
    if (!roomType) {
      const slug = `sharing-${capacity}`;
      roomType = await prisma.roomType.findUnique({ where: { slug } });
      if (!roomType) roomType = await prisma.roomType.create({ data: { name: `${capacity}-Share Room`, slug, description: `Room with ${capacity} resident bed${capacity === 1 ? "" : "s"}.`, totalBeds: capacity } });
    }

    const bedLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const newRoom = await prisma.$transaction(async (tx) => {
      const room = await tx.room.create({
        data: { hostelId, roomTypeId: roomType!.id, roomNumber: roomNumber.trim(), floor: floorNumber, building: floorNumber <= 3 ? "Main Wing" : "Sky Wing", genderCategory, capacity, isAC, status: "ACTIVE" },
      });
      await tx.bed.createMany({ data: Array.from({ length: capacity }, (_, index) => ({
        roomId: room.id,
        hostelId,
        bedNumber: capacity === 1 ? "Bed 1" : `Bed ${bedLetters[index % bedLetters.length]}`,
        tier: capacity === 1 ? "SINGLE" : index % 2 === 0 ? "LOWER_BUNK" : "UPPER_BUNK",
        status: "AVAILABLE",
      })) });
      return tx.room.findUnique({ where: { id: room.id }, include: { roomType: true, beds: true } });
    });

    return NextResponse.json({
      success: true,
      message: `Room ${roomNumber} added successfully with ${capacity} beds`,
      room: newRoom,
    });
  } catch (error: any) {
    console.error("Room creation error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create room" },
      { status: 500 }
    );
  }
}
