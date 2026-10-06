import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";
import { isLongStay } from "@/lib/booking-policy";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const bookingId = params.id;
    const { reason = "Customer requested cancellation" } = await req.json();

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { hostel: true, room: true, bed: true, payments: true },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 }
      );
    }

    // Verify ownership if customer
    if (user.role === "CUSTOMER" && booking.customerId !== user.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized to cancel this booking" },
        { status: 403 }
      );
    }

    if (
      user.role === "CUSTOMER" &&
      isLongStay(new Date(booking.checkInDate), new Date(booking.checkOutDate))
    ) {
      return NextResponse.json(
        { success: false, message: "Bookings of 28 nights or more require one month notice and can only be cancelled by an administrator." },
        { status: 403 }
      );
    }

    if (["CANCELLED", "CHECKED_OUT", "REFUNDED", "NO_SHOW"].includes(booking.bookingStatus)) {
      return NextResponse.json(
        { success: false, message: "This booking can no longer be cancelled" },
        { status: 400 }
      );
    }

    // Cancellation Policy calculation:
    // > 7 days: 100% refund
    // 3 - 7 days: 50% refund
    // < 3 days: 0% refund
    const now = new Date();
    const checkIn = new Date(booking.checkInDate);
    const diffDays = (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    let refundPct = 0;
    if (diffDays >= 7) {
      refundPct = 1.0;
    } else if (diffDays >= 3) {
      refundPct = 0.5;
    } else {
      refundPct = 0.0;
    }

    const refundableAmount = Math.round(booking.paidAmount * refundPct);

    // Atomic cancellation & bed inventory release
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Booking
      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          bookingStatus: "CANCELLED",
        },
      });

      // 2. Release Bed immediately so others can book it!
      await tx.bed.update({
        where: { id: booking.bedId },
        data: {
          status: "AVAILABLE",
          currentOccupantId: null,
        },
      });

      // 3. Create Refund record if refundable
      let refundRecord = null;
      if (refundableAmount > 0 && booking.payments[0]) {
        refundRecord = await tx.refund.create({
          data: {
            bookingId: booking.id,
            paymentId: booking.payments[0].id,
            amount: refundableAmount,
            reason: `${reason} (${Math.round(refundPct * 100)}% policy refund)`,
            status: "REQUESTED",
          },
        });
      }

      return { updatedBooking, refundRecord };
    });

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: "BOOKING_CANCELLED",
      entity: "Booking",
      entityId: booking.id,
      newValue: {
        refundAmount: refundableAmount,
        refundPercentage: Math.round(refundPct * 100),
        reason,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Booking cancelled successfully. Refund amount of ₹${refundableAmount.toLocaleString()} (${Math.round(
        refundPct * 100
      )}%) has been queued.`,
      data: result,
    });
  } catch (error: any) {
    console.error("Cancellation error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to cancel booking" },
      { status: 500 }
    );
  }
}
