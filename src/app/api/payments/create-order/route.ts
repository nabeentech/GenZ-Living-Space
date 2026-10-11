import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createPaymentOrder } from "@/lib/razorpay";
import { releaseExpiredBookingHolds } from "@/lib/booking-cleanup";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await releaseExpiredBookingHolds();
    const user = await getSessionUser();
    if (!user || user.role !== "CUSTOMER") {
      return NextResponse.json({ success: false, message: "Please sign in to continue payment." }, { status: 401 });
    }
    const { bookingId, amount } = await req.json();

    if (!bookingId) {
      return NextResponse.json(
        { success: false, message: "bookingId is required" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { hostel: true },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 }
      );
    }

    if (booking.customerId !== user.id) {
      return NextResponse.json({ success: false, message: "You cannot pay for this booking." }, { status: 403 });
    }

    if (booking.bookingStatus === "PAYMENT_PENDING" && booking.holdExpiresAt && booking.holdExpiresAt <= new Date()) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment session has expired. Please select your room and bed again.",
        },
        { status: 410 }
      );
    }

    if (booking.bookingStatus !== "PAYMENT_PENDING" && !(booking.bookingStatus === "CONFIRMED" && booking.balanceAmount > 0)) {
      return NextResponse.json({ success: false, message: "This booking is not awaiting payment." }, { status: 409 });
    }

    if (booking.bookingStatus === "CONFIRMED" && !amount) {
      return NextResponse.json(
        { success: false, message: "This booking is already confirmed and paid." },
        { status: 400 }
      );
    }

    // Use provided amount or fall back to booking total
    const paymentAmount = booking.bookingStatus === "PAYMENT_PENDING" ? booking.totalAmount : booking.balanceAmount;
    if (amount !== undefined && Number(amount) !== paymentAmount) {
      return NextResponse.json({ success: false, message: "Payment amount does not match the booking balance." }, { status: 400 });
    }

    // Create payment gateway order
    const order = await createPaymentOrder({
      amount: paymentAmount,
      currency: "INR",
      receipt: booking.bookingReference,
      notes: {
        hostel: booking.hostel.name,
        bookingRef: booking.bookingReference,
        guestEmail: booking.guestEmail,
        paymentType: amount ? "balance_payment" : "full_payment",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: order.keyId,
        bookingReference: booking.bookingReference,
        totalAmount: booking.totalAmount,
        paymentAmount: paymentAmount,
      },
    });
  } catch (error: any) {
    console.error("Create payment order error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create order" },
      { status: 500 }
    );
  }
}
