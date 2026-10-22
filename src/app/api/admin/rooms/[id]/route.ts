import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, ROLES } from "@/lib/auth";
import { getRoomTypeForCapacity } from "@/lib/room-types";
import { canUserEdit, canUserDelete } from "@/lib/permissions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sessionUser = await getSessionUser();

    // Check authorization
    if (!sessionUser || ![ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER].includes(sessionUser.role as any)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access" },
        { status: 403 }
      );
    }

    if (!canUserEdit(sessionUser)) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to edit rooms" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { genderCategory, status, capacity, isAC } = body;

    // Validate inputs
    if (!genderCategory && !status && capacity === undefined && isAC === undefined) {
      return NextResponse.json(
        { success: false, message: "No fields to update" },
        { status: 400 }
      );
    }

    // Get current room
    const currentRoom = await prisma.room.findUnique({
      where: { id },
      include: { beds: { include: { bookings: { select: { id: true } } } } },
    });

    if (!currentRoom) {
      return NextResponse.json(
        { success: false, message: "Room not found" },
        { status: 404 }
      );
    }

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

    if (isAC !== undefined) {
      if (typeof isAC !== "boolean") {
        return NextResponse.json(
          { success: false, message: "isAC must be a boolean value" },
          { status: 400 }
        );
      }
      updateData.isAC = isAC;
    }

    if (capacity !== undefined) {
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 20) {
        return NextResponse.json(
          { success: false, message: "Capacity must be between 1 and 20" },
          { status: 400 }
        );
      }
      updateData.capacity = capacity;
    }

    const updatedRoom = await prisma.$transaction(async (tx) => {
      if (capacity !== undefined) {
        const roomType = await getRoomTypeForCapacity(tx, capacity);
        updateData.roomTypeId = roomType.id;
        const currentBedCount = currentRoom.beds.length;

        if (capacity > currentBedCount) {
          const bedsToAdd = Array.from({ length: capacity - currentBedCount }, (_, offset) => {
            const index = currentBedCount + offset;
            let bedNumber: string;
            let tier: string;
            if (capacity === 1) {
              bedNumber = "King Bed";
              tier = "DOUBLE";
            } else if (capacity === 2) {
              bedNumber = index === 0 ? "Bed Left" : "Bed Right";
              tier = "SINGLE";
            } else if (capacity <= 4) {
              bedNumber = `Bed ${"ABCDEFGH"[index]}`;
              tier = index % 2 === 0 ? "LOWER_BUNK" : "UPPER_BUNK";
            } else if (capacity <= 6) {
              bedNumber = `Pod ${index + 1}`;
              tier = index < 3 ? "LOWER_BUNK" : "UPPER_BUNK";
            } else {
              bedNumber = `Bed ${index + 1}`;
              tier = index < Math.ceil(capacity / 2) ? "LOWER_BUNK" : "UPPER_BUNK";
            }
            return { roomId: id, hostelId: currentRoom.hostelId, bedNumber, tier, status: "AVAILABLE" };
          });
          await tx.bed.createMany({ data: bedsToAdd });
        } else if (capacity < currentBedCount) {
          const removeCount = currentBedCount - capacity;
          const removable = currentRoom.beds.filter((bed) => bed.bookings.length === 0).slice(-removeCount);
          if (removable.length < removeCount) {
            throw new Error("Beds with booking history cannot be removed. Cancel or move their bookings first.");
          }
          await tx.bed.deleteMany({ where: { id: { in: removable.map((bed) => bed.id) } } });
        }
      }

      return tx.room.update({
        where: { id },
        data: updateData,
      });
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sessionUser = await getSessionUser();

    // Check authorization
    if (!sessionUser || ![ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER].includes(sessionUser.role as any)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access" },
        { status: 403 }
      );
    }

    if (!canUserDelete(sessionUser)) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to delete rooms" },
        { status: 403 }
      );
    }

    // Get room with all related data
    const room = await prisma.room.findUnique({
      where: { id },
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

    // Check if room has any historical booking records (CHECKED_OUT, CANCELLED, etc.)
    const totalPastBookings = room.beds.flatMap((bed) => bed.bookings).length;
    if (totalPastBookings > 0) {
      // Soft-delete to preserve audit logs and historical guest invoices
      await prisma.room.update({
        where: { id },
        data: { active: false, status: "BLOCKED" },
      });
      await prisma.bed.updateMany({
        where: { roomId: id },
        data: { status: "BLOCKED" },
      });

      return NextResponse.json({
        success: true,
        message: `Room ${room.roomNumber} contains historical booking records and has been deactivated/archived safely.`,
      });
    }

    // Safe to hard delete only if no bookings ever touched this room
    await prisma.bed.deleteMany({
      where: { roomId: id },
    });

    await prisma.room.delete({
      where: { id },
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
