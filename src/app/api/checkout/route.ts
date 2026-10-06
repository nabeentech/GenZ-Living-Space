import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (
      !user ||
      !hasPermission(user.role, [
        ROLES.SUPER_ADMIN,
        ROLES.PROPERTY_MANAGER,
        ROLES.RECEPTIONIST,
      ])
    ) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Staff access required." },
        { status: 403 }
      );
    }

    const { bookingId, additionalCharges = [] } = await req.json();

    if (!bookingId) {
      return NextResponse.json(
        { success: false, message: "bookingId is required" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { hostel: true, room: true, bed: true },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 }
      );
    }

    if (booking.bookingStatus !== "CHECKED_IN") {
      return NextResponse.json(
        { success: false, message: "Only checked-in bookings can be checked out" },
        { status: 400 }
      );
    }

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Add any additional charges if passed
      let extraTotal = 0;
      for (const charge of additionalCharges) {
        const amount = Number(charge.amount);
        if (Number.isFinite(amount) && amount > 0) {
          await tx.additionalCharge.create({
            data: {
              bookingId: booking.id,
              category: charge.category || "OTHER",
              description: charge.description || "Additional charge at checkout",
              amount,
              status: "PAID",
              addedBy: user.name,
            },
          });
          extraTotal += amount;
        }
      }

      // 2. Mark Booking as CHECKED_OUT
      const b = await tx.booking.update({
        where: { id: booking.id },
        data: {
          bookingStatus: "CHECKED_OUT",
          checkOutTime: now,
          checkedOutBy: user.name,
          totalAmount: { increment: extraTotal },
          paidAmount: { increment: extraTotal },
        },
        include: { hostel: true, room: true, bed: true },
      });

      await tx.invoice.updateMany({
        where: { bookingId: booking.id },
        data: {
          totalAmount: { increment: extraTotal },
          paidAmount: { increment: extraTotal },
        },
      });

      // 3. Mark Bed status as CLEANING and release current occupant
      await tx.bed.update({
        where: { id: booking.bedId },
        data: {
          status: "CLEANING",
          currentOccupantId: null,
        },
      });

      // 4. Automatically trigger Housekeeping task
      await tx.housekeepingTask.create({
        data: {
          hostelId: booking.hostelId,
          roomId: booking.roomId,
          bedId: booking.bedId,
          taskType: "DEEP_CLEAN",
          status: "DIRTY",
          notes: `Automatic checkout clean task for guest ${booking.guestName}. Check-out by ${user.name}.`,
        },
      });

      return b;
    });

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: "GUEST_CHECKED_OUT",
      entity: "Booking",
      entityId: booking.id,
      newValue: {
        checkedOutBy: user.name,
        time: now.toISOString(),
        bed: booking.bed.bedNumber,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Check-out completed for ${booking.guestName}. Bed ${booking.bed.bedNumber} is queued for Housekeeping.`,
      data: updated,
    });
  } catch (error: any) {
    console.error("Check-out error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to process check-out" },
      { status: 500 }
    );
  }
}
