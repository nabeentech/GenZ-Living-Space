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
    const { hostelId, roomNumber, floor, genderCategory, capacity } = body;

    // Validate inputs
    if (!hostelId || !roomNumber || !floor || !genderCategory || !capacity) {
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

    // Get a default room type (4-bed dorm)
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

    // Create room
    const newRoom = await prisma.room.create({
      data: {
        hostelId,
        roomTypeId: defaultRoomType.id,
        roomNumber,
        floor,
        building: floor <= 3 ? "Main Wing" : "Sky Wing",
        genderCategory,
        capacity,
        status: "ACTIVE",
      },
    });

    // Create beds for the room
    const bedLetters = ["A", "B", "C", "D", "E", "F", "G", "H"];
    for (let i = 0; i < capacity; i++) {
      let bedNumber: string;
      let tier: string;

      if (capacity === 1) {
        bedNumber = "King Bed";
        tier = "DOUBLE";
      } else if (capacity === 2) {
        bedNumber = i === 0 ? "Bed Left" : "Bed Right";
        tier = "SINGLE";
      } else if (capacity <= 4) {
        bedNumber = `Bed ${bedLetters[i % 4]}`;
        tier = i % 2 === 0 ? "LOWER_BUNK" : "UPPER_BUNK";
      } else if (capacity <= 6) {
        bedNumber = `Pod ${i + 1}`;
        tier = i < 3 ? "LOWER_BUNK" : "UPPER_BUNK";
      } else {
        bedNumber = `Bed ${i + 1}`;
        tier = i < Math.ceil(capacity / 2) ? "LOWER_BUNK" : "UPPER_BUNK";
      }

      await prisma.bed.create({
        data: {
          roomId: newRoom.id,
          hostelId,
          bedNumber,
          tier,
          status: "AVAILABLE",
        },
      });
    }

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
