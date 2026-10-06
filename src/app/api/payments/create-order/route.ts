import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createPaymentOrder } from "@/lib/razorpay";
import { releaseExpiredBookingHolds } from "@/lib/booking-cleanup";

export async function POST(req: Request) {
  try {
    await releaseExpiredBookingHolds();
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

    // Check if temporary hold has expired (only for pending bookings)
    if (booking.bookingStatus === "PENDING" && booking.holdExpiresAt && booking.holdExpiresAt < new Date()) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment session has expired. Please select your room and bed again.",
        },
        { status: 410 }
      );
    }

    if (booking.bookingStatus === "CONFIRMED" && !amount) {
      return NextResponse.json(
        { success: false, message: "This booking is already confirmed and paid." },
        { status: 400 }
      );
    }

    // Use provided amount or fall back to booking total
    const paymentAmount = amount || booking.totalAmount;

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
