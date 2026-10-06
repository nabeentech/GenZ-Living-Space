import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, ROLES } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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
    const { genderCategory, status, capacity } = body;

    // Validate inputs
    if (!genderCategory && !status && capacity === undefined) {
      return NextResponse.json(
        { success: false, message: "No fields to update" },
        { status: 400 }
      );
    }

    // Get current room
    const currentRoom = await prisma.room.findUnique({
      where: { id: params.id },
      include: { beds: true },
    });

    if (!currentRoom) {
      return NextResponse.json(
        { success: false, message: "Room not found" },
        { status: 404 }
      );
    }

    // Update room
    const updateData: any = {};
    if (genderCategory) {
      if (!["MALE", "FEMALE", "MIXED", "PRIVATE"].includes(genderCategory)) {
        return NextResponse.json(
          { success: false, message: "Invalid gender category" },
          { status: 400 }
        );
      }
      updateData.genderCategory = genderCategory;
    }

    if (status) {
      if (!["ACTIVE", "MAINTENANCE", "BLOCKED"].includes(status)) {
        return NextResponse.json(
          { success: false, message: "Invalid room status" },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    if (capacity !== undefined) {
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 20) {
        return NextResponse.json(
          { success: false, message: "Capacity must be between 1 and 20" },
          { status: 400 }
        );
      }
      updateData.capacity = capacity;

      // Handle bed additions/removals
      const currentBedCount = currentRoom.beds.length;
      
      if (capacity > currentBedCount) {
        // Add new beds
        const bedsToAdd = capacity - currentBedCount;
        const bedLetters = ["A", "B", "C", "D", "E", "F", "G", "H"];
        
        for (let i = 0; i < bedsToAdd; i++) {
          const bedIndex = currentBedCount + i;
          let bedNumber: string;
          let tier: string;

          if (capacity === 1) {
            bedNumber = "King Bed";
            tier = "DOUBLE";
          } else if (capacity === 2) {
            bedNumber = bedIndex === 0 ? "Bed Left" : "Bed Right";
            tier = "SINGLE";
          } else if (capacity <= 4) {
            bedNumber = `Bed ${bedLetters[bedIndex % 4]}`;
            tier = bedIndex % 2 === 0 ? "LOWER_BUNK" : "UPPER_BUNK";
          } else if (capacity <= 6) {
            bedNumber = `Pod ${bedIndex + 1}`;
            tier = bedIndex < 3 ? "LOWER_BUNK" : "UPPER_BUNK";
          } else {
            bedNumber = `Bed ${bedIndex + 1}`;
            tier = bedIndex < Math.ceil(capacity / 2) ? "LOWER_BUNK" : "UPPER_BUNK";
          }

          await prisma.bed.create({
            data: {
              roomId: params.id,
              hostelId: currentRoom.hostelId,
              bedNumber: bedNumber,
              tier: tier,
              status: "AVAILABLE",
            },
          });
        }
      } else if (capacity < currentBedCount) {
        // Remove beds (from the end)
        const bedsToRemove = currentBedCount - capacity;
        const bedsToDelete = currentRoom.beds.slice(-bedsToRemove);
        
        for (const bed of bedsToDelete) {
          await prisma.bed.delete({
            where: { id: bed.id },
          });
        }
      }
    }

    const updatedRoom = await prisma.room.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: `Room ${updatedRoom.roomNumber} updated successfully`,
      room: updatedRoom,
    });
  } catch (error: any) {
    console.error("Room update error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update room" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionUser = await getSessionUser();

    // Check authorization
    if (!sessionUser || ![ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER].includes(sessionUser.role as any)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access" },
        { status: 403 }
      );
    }

    // Get room with all related data
    const room = await prisma.room.findUnique({
      where: { id: params.id },
      include: {
        beds: {
          include: {
            bookings: true,
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json(
        { success: false, message: "Room not found" },
        { status: 404 }
      );
    }

    // Check if any beds have active bookings
    const activeBookings = room.beds.flatMap((bed) =>
      bed.bookings.filter((b: any) => b.bookingStatus === "CHECKED_IN" || b.bookingStatus === "CONFIRMED")
    );

    if (activeBookings.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Cannot delete room with ${activeBookings.length} active booking(s). Please complete or cancel bookings first.` 
        },
        { status: 400 }
      );
    }

    // Delete all beds first
    await prisma.bed.deleteMany({
      where: { roomId: params.id },
    });

    // Delete the room
    await prisma.room.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: `Room ${room.roomNumber} deleted successfully`,
    });
  } catch (error: any) {
    console.error("Room deletion error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete room" },
      { status: 500 }
    );
  }
}
