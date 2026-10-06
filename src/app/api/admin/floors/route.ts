import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, ROLES } from "@/lib/auth";

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
    const { hostelId, floorNumber, roomCount } = body;

    // Validate inputs
    if (!hostelId || !floorNumber || !roomCount) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    if (roomCount < 1 || roomCount > 50) {
      return NextResponse.json(
        { success: false, message: "Room count must be between 1 and 50" },
        { status: 400 }
      );
    }

    // Check if floor already exists
    const existingRoom = await prisma.room.findFirst({
      where: {
        hostelId,
        floor: floorNumber,
      },
    });

    if (existingRoom) {
      return NextResponse.json(
        { success: false, message: `Floor ${floorNumber} already exists` },
        { status: 400 }
      );
    }

    // Get default room type
    const defaultRoomType = await prisma.roomType.findFirst({
      where: {
        name: "4-Bed Creator Dorm",
      },
    });

    if (!defaultRoomType) {
      return NextResponse.json(
        { success: false, message: "Default room type not found" },
        { status: 400 }
      );
    }

    // Create rooms for the floor
    const roomLetters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
    const genderOptions = ["MIXED", "FEMALE", "MIXED", "PRIVATE", "MIXED"];
    
    for (let i = 1; i <= roomCount; i++) {
      const roomNumber = `${floorNumber}${i.toString().padStart(2, "0")}`;
      const genderCategory = genderOptions[i % genderOptions.length];

      const newRoom = await prisma.room.create({
        data: {
          hostelId,
          roomTypeId: defaultRoomType.id,
          roomNumber,
          floor: floorNumber,
          building: floorNumber <= 3 ? "Main Wing" : "Sky Wing",
          genderCategory,
          capacity: 4, // Default 4 beds per room
          status: "ACTIVE",
        },
      });

      // Create 4 beds for each room
      const bedLetters = ["A", "B", "C", "D"];
      for (let bedIndex = 0; bedIndex < 4; bedIndex++) {
        await prisma.bed.create({
          data: {
            roomId: newRoom.id,
            hostelId,
            bedNumber: `Bed ${bedLetters[bedIndex]}`,
            tier: bedIndex % 2 === 0 ? "LOWER_BUNK" : "UPPER_BUNK",
            status: "AVAILABLE",
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Floor ${floorNumber} created successfully with ${roomCount} rooms (${roomCount * 4} beds total)`,
    });
  } catch (error: any) {
    console.error("Floor creation error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create floor" },
      { status: 500 }
    );
  }
}
