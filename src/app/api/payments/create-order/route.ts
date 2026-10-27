import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { randomUUID } from "node:crypto";
import { claimPhonePeAttempt } from "@/lib/payment-initiation";
import { paymentTransaction, PaymentFlowError } from "@/lib/payment-reconciliation";
import { sendPhonePePayment } from "@/lib/phonepe-payment";
import { diagnostic, checkoutExpirySeconds } from "@/lib/phonepe";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
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
    const merchantOrderId = `GZLS_${randomUUID()}`;
    if (booking.bookingStatus === "PAYMENT_PENDING") {
      try { checkoutExpirySeconds(booking.holdExpiresAt || new Date(0)); }
      catch { throw new PaymentFlowError("Booking hold is too close to expiry; create a fresh booking", 410); }
    }

    // 1. Create a PENDING payment record in Prisma BEFORE calling PhonePe
    const paymentRecord = await paymentTransaction(prisma, async tx => {
      const current = await claimPhonePeAttempt(tx, booking.id);
      if (Math.round(paymentAmount * 100) > Math.round((current.totalAmount - current.paidAmount) * 100)) throw new PaymentFlowError("Outstanding amount changed; refresh and retry");
      return tx.payment.create({
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
    });
    diagnostic("payment.initiated", { merchantOrderId, amountPaise: amountInPaise, holdExpiresAt: booking.holdExpiresAt?.toISOString() });

    // 2. Create the PhonePe hosted checkout session
    const checkout = await sendPhonePePayment(paymentRecord, {
      merchantOrderId,
      amount: amountInPaise,
      holdExpiresAt: booking.bookingStatus === "PAYMENT_PENDING" ? booking.holdExpiresAt! : undefined,
      redirectUrl: `${cleanOrigin}/payment/return?merchantOrderId=${encodeURIComponent(merchantOrderId)}`,
      metaInfo: {
        udf1: booking.id,
        udf2: "genz-living-space",
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
    diagnostic("checkout.failed", { reason: error instanceof PaymentFlowError ? "BOOKING_VALIDATION_FAILED" : "INITIATION_UNAVAILABLE" });
    return NextResponse.json(
      { success: false, message: error instanceof PaymentFlowError ? error.message : "Unable to initiate payment. Check existing payment status before retrying." },
      { status: error instanceof PaymentFlowError ? error.status : 500 }
    );
  }
}
