import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createPayment } from "@/lib/phonepe";
import { releaseExpiredBookingHolds } from "@/lib/booking-cleanup";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await releaseExpiredBookingHolds();
    const user = await getSessionUser();
    if (!user || user.role !== "CUSTOMER") {
      return NextResponse.json(
        { success: false, message: "Please sign in to continue payment." },
        { status: 401 }
      );
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
      return NextResponse.json(
        { success: false, message: "You cannot pay for this booking." },
        { status: 403 }
      );
    }

    if (
      booking.bookingStatus === "PAYMENT_PENDING" &&
      booking.holdExpiresAt &&
      booking.holdExpiresAt <= new Date()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment session has expired. Please select your room and bed again.",
        },
        { status: 410 }
      );
    }

    if (
      booking.bookingStatus !== "PAYMENT_PENDING" &&
      !(booking.bookingStatus === "CONFIRMED" && booking.balanceAmount > 0)
    ) {
      return NextResponse.json(
        { success: false, message: "This booking is not awaiting payment." },
        { status: 409 }
      );
    }

    if (booking.bookingStatus === "CONFIRMED" && booking.balanceAmount <= 0) {
      return NextResponse.json(
        { success: false, message: "This booking is already fully paid." },
        { status: 400 }
      );
    }

    // Determine authoritative payment amount in rupees
    let paymentAmount: number;
    if (booking.bookingStatus === "PAYMENT_PENDING") {
      // Must strictly use the database totalAmount; client cannot tamper with price
      paymentAmount = booking.totalAmount;
    } else {
      // Balance payment for confirmed booking
      const requested = amount ? Number(amount) : booking.balanceAmount;
      if (isNaN(requested) || requested <= 0) {
        return NextResponse.json({ success: false, message: "Invalid payment amount." }, { status: 400 });
      }
      if (requested > booking.balanceAmount) {
        return NextResponse.json(
          { success: false, message: `Payment amount cannot exceed remaining balance of Rs. ${booking.balanceAmount}` },
          { status: 400 }
        );
      }
      paymentAmount = Math.round(requested * 100) / 100;
    }

    const amountInPaise = Math.round(paymentAmount * 100);
    if (!Number.isSafeInteger(amountInPaise) || amountInPaise < 100) {
      return NextResponse.json(
        { success: false, message: "Invalid payment amount (minimum Rs. 1 required)." },
        { status: 400 }
      );
    }

    const baseOrigin =
      process.env.APP_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";
    const cleanOrigin = baseOrigin.replace(/\/+$/, "");

    // Clean, unique merchantOrderId: max 63 chars, alphanumeric with _ and -
    const cleanRef = booking.bookingReference.replace(/[^A-Za-z0-9_-]/g, "");
    const merchantOrderId = `GZLS_${cleanRef}_${Date.now().toString(36)}`;

    // 1. Create a PENDING payment record in Prisma BEFORE calling PhonePe
    const paymentRecord = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        customerId: user.id,
        amount: paymentAmount,
        currency: "INR",
        gateway: "PHONEPE",
        gatewayOrderId: merchantOrderId,
        status: "PENDING",
        paymentMethod: "PG_CHECKOUT",
        metadata: JSON.stringify({
          bookingReference: booking.bookingReference,
          hostelName: booking.hostel.name,
          guestEmail: booking.guestEmail,
          paymentType: amount ? "balance_payment" : "full_payment",
        }),
      },
    });

    // 2. Create the PhonePe hosted checkout session
    const checkout = await createPayment({
      merchantOrderId,
      amount: amountInPaise,
      redirectUrl: `${cleanOrigin}/payment/return?merchantOrderId=${encodeURIComponent(merchantOrderId)}`,
      metaInfo: {
        udf1: booking.id,
        udf2: "genz-living-space",
      },
    });

    // 3. Save PhonePe provider order ID
    await prisma.payment.update({
      where: { id: paymentRecord.id },
      data: {
        gatewayPaymentId: checkout.orderId,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        merchantOrderId,
        redirectUrl: checkout.redirectUrl,
        orderId: checkout.orderId,
        bookingReference: booking.bookingReference,
        totalAmount: booking.totalAmount,
        paymentAmount,
      },
    });
  } catch (error: any) {
    console.error("PhonePe create-order error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to initiate payment. Please retry safely." },
      { status: 500 }
    );
  }
}
