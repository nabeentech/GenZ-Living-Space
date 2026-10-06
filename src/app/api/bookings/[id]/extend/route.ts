import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { calculateBookingPrice } from "@/lib/pricing";
import { logAuditAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { checkOutDate } = await req.json();
    const requestedCheckOut = new Date(checkOutDate);
    if (!checkOutDate || Number.isNaN(requestedCheckOut.getTime())) {
      return NextResponse.json({ success: false, message: "A valid new checkout date is required" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: { room: { include: { roomType: true } }, bed: true, hostel: true, invoices: true },
    });

    if (!booking) {
      return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
    }
    if (user.role === "CUSTOMER" && booking.customerId !== user.id) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }
    if (!["CONFIRMED", "CHECKED_IN"].includes(booking.bookingStatus)) {
      return NextResponse.json({ success: false, message: "Only active bookings can be extended" }, { status: 400 });
    }

    const currentCheckOut = new Date(booking.checkOutDate);
    if (requestedCheckOut <= currentCheckOut) {
      return NextResponse.json({ success: false, message: "New checkout date must be later than the current checkout date" }, { status: 400 });
    }

    const conflict = await prisma.booking.findFirst({
      where: {
        id: { not: booking.id },
        bedId: booking.bedId,
        checkInDate: { lt: requestedCheckOut },
        checkOutDate: { gt: currentCheckOut },
        OR: [
          { bookingStatus: { in: ["CONFIRMED", "CHECKED_IN"] } },
          { bookingStatus: "PAYMENT_PENDING", holdExpiresAt: { gt: new Date() } },
        ],
      },
    });
    if (conflict) {
      return NextResponse.json({ success: false, message: "This bed is not available for the requested extension dates" }, { status: 409 });
    }

    const pricing = calculateBookingPrice({
      checkInDate: booking.checkInDate,
      checkOutDate: requestedCheckOut,
      basePrice: booking.room.roomType.basePrice,
      weeklyDiscountPct: booking.room.roomType.weeklyDiscountPct,
      monthlyPrice: booking.room.roomType.monthlyPrice,
      securityDeposit: booking.room.roomType.securityDeposit,
    });
    const additionalAmount = Math.max(0, pricing.totalAmount - booking.totalAmount);

    const updatedBooking = await prisma.$transaction(async (tx) => {
      // DO NOT update checkOutDate yet - only update when payment is verified
      // Keep the booking in its current state until extension payment is captured
      const extended = await tx.booking.findUnique({
        where: { id: booking.id },
        include: { hostel: true, room: true, bed: true },
      });

      // Create extension request record with the requested dates and amount
      await tx.bookingExtension.create({
        data: {
          bookingId: booking.id,
          originalCheckOut: currentCheckOut,
          newCheckOut: requestedCheckOut,
          additionalAmount: additionalAmount,
          status: additionalAmount > 0 ? "REQUESTED" : "CONFIRMED",
        },
      });

      // Only create payment if there's an additional amount
      if (additionalAmount > 0) {
        await tx.payment.create({
          data: {
            bookingId: booking.id,
            customerId: booking.customerId,
            amount: additionalAmount,
            currency: "INR",
            gateway: "RAZORPAY",
            gatewayPaymentId: `pay_extension_${Date.now()}`,
            status: "PENDING",
            paymentMethod: "razorpay",
            metadata: JSON.stringify({ type: "BOOKING_EXTENSION", previousCheckOut: currentCheckOut.toISOString(), requestedCheckOut: requestedCheckOut.toISOString() }),
          },
        });
      } else {
        // No additional charge - auto-approve the extension
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            checkOutDate: requestedCheckOut,
            stayType: pricing.stayType,
            baseAmount: pricing.baseAmount,
            taxAmount: pricing.taxAmount,
            serviceFee: pricing.serviceFee,
            securityDeposit: pricing.securityDeposit,
            discountAmount: pricing.discountAmount,
            totalAmount: pricing.totalAmount,
          },
        });
      }

      return extended;
          balanceDue: additionalAmount,
          baseAmount: pricing.baseAmount,
          taxAmount: pricing.taxAmount,
          serviceFee: pricing.serviceFee,
          securityDeposit: pricing.securityDeposit,
          discountAmount: pricing.discountAmount,
          status: additionalAmount > 0 ? "PARTIAL" : "PAID",
        },
      });

      return updated;
    });

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: "BOOKING_EXTENDED",
      entity: "Booking",
      entityId: booking.id,
      newValue: { previousCheckOut: currentCheckOut.toISOString(), newCheckOut: requestedCheckOut.toISOString(), additionalAmount },
    });

    return NextResponse.json({
      success: true,
      message: additionalAmount > 0
        ? `Stay extended. Please pay remaining Rs. ${additionalAmount.toLocaleString()} to confirm extension.`
        : "Stay extended successfully.",
      data: { booking: updatedBooking, additionalAmount },
    });
  } catch (error: any) {
    console.error("Booking extension error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to extend booking" }, { status: 500 });
  }
}
