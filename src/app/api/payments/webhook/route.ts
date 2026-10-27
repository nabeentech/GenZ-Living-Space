import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPhonePeWebhook } from "@/lib/phonepe";
import { generateBookingQRCode } from "@/lib/qr";
import { createInvoiceWithRetry } from "@/lib/invoice";
import { logAuditAction } from "@/lib/audit";

export const runtime = "nodejs";

type PhonePeWebhook = {
  event: string;
  payload: {
    orderId: string;
    merchantId?: string;
    merchantOrderId: string;
    state: string;
    amount: number; // in paise
    paymentDetails?: Array<{
      transactionId?: string;
      amount: number;
      state: string;
      paymentMode?: string;
    }>;
  };
};

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // Verify webhook authentication (SHA username/password or HMAC)
    const isVerified = verifyPhonePeWebhook(
      {
        authorization: req.headers.get("authorization"),
        keyId: req.headers.get("x-phonepe-checksum-key-id"),
        signature: req.headers.get("x-phonepe-checksum-signature"),
      },
      rawBody
    );

    // In local dev without credentials, permit testing if explicitly marked
    const isDev = process.env.NODE_ENV !== "production";
    if (!isVerified && !isDev) {
      console.warn("PhonePe Webhook verification failed: unauthorized");
      return NextResponse.json({ success: false, message: "Invalid webhook authentication" }, { status: 401 });
    }

    let event: PhonePeWebhook;
    try {
      event = JSON.parse(rawBody) as PhonePeWebhook;
    } catch {
      return NextResponse.json({ success: false, message: "Malformed JSON payload" }, { status: 400 });
    }

    if (!event.event || !event.payload?.merchantOrderId) {
      return NextResponse.json({ success: true, message: "Ignored: Missing identifiers" }, { status: 200 });
    }

    const { merchantOrderId, state, amount } = event.payload;

    // 1. Locate payment record
    const payment = await prisma.payment.findFirst({
      where: { gatewayOrderId: merchantOrderId },
      include: { booking: true },
    });

    if (!payment) {
      console.warn(`PhonePe Webhook: No payment record found for ${merchantOrderId}`);
      return NextResponse.json({ success: true, message: "Unknown merchant order" }, { status: 200 });
    }

    // 2. Validate amount in paise
    const expectedPaise = Math.round(payment.amount * 100);
    if (amount && Math.abs(expectedPaise - amount) > 5) {
      console.error("PhonePe Webhook amount mismatch:", { expectedPaise, receivedPaise: amount });
      return NextResponse.json({ success: false, message: "Payment amount mismatch" }, { status: 400 });
    }

    // 3. Handle Order Completed
    if (
      (event.event === "checkout.order.completed" || event.event === "payment.captured") &&
      state === "COMPLETED"
    ) {
      if (payment.status === "COMPLETED") {
        return NextResponse.json({ success: true, received: true, message: "Already completed" }, { status: 200 });
      }

      const txnDetail = event.payload.paymentDetails?.find((p) => p.state === "COMPLETED");
      const txnId = txnDetail?.transactionId || event.payload.orderId;
      const paymentMode = txnDetail?.paymentMode || "PHONEPE_WEBHOOK";

      const booking = await prisma.booking.findUnique({
        where: { id: payment.bookingId },
        include: { hostel: true, room: true, bed: true, invoices: true },
      });

      if (!booking) {
        return NextResponse.json({ success: true, message: "Booking not found" }, { status: 200 });
      }

      const qrCodeData = await generateBookingQRCode(booking.bookingReference, booking.id);

      let meta: any = {};
      try {
        meta = payment.metadata ? JSON.parse(payment.metadata) : {};
      } catch {}

      await prisma.$transaction(async (tx) => {
        // Atomic check: only update if still PENDING to prevent double-credit race conditions
        const updated = await tx.payment.updateMany({
          where: { id: payment.id, status: "PENDING" },
          data: {
            status: "COMPLETED",
            gatewayPaymentId: txnId,
            paymentMethod: paymentMode,
          },
        });

        if (updated.count === 0) {
          // Already processed by concurrent return redirect or another webhook retry
          return;
        }

        if (meta.type === "MONTHLY_RENT") {
          const cycleEnd = meta.cycleEnd
            ? new Date(meta.cycleEnd)
            : new Date(new Date(booking.checkOutDate).getTime() + 30 * 24 * 60 * 60 * 1000);
          const paidNow = payment.amount;

          // Advance booking checkOutDate and financial totals
          await tx.booking.update({
            where: { id: booking.id },
            data: {
              checkOutDate: cycleEnd,
              paidAmount: (booking.paidAmount || 0) + paidNow,
              totalAmount: (booking.totalAmount || 0) + paidNow,
              paymentStatus: "PAID",
            },
          });

          // Mark cycle invoice as PAID
          if (meta.invoiceId) {
            await tx.invoice.update({
              where: { id: meta.invoiceId },
              data: {
                status: "PAID",
                paidAmount: paidNow,
                balanceDue: 0,
              },
            });
          } else if (meta.invoiceNumber) {
            await tx.invoice.updateMany({
              where: { invoiceNumber: meta.invoiceNumber },
              data: {
                status: "PAID",
                paidAmount: paidNow,
                balanceDue: 0,
              },
            });
          }

          // Create confirmed booking extension
          await tx.bookingExtension.create({
            data: {
              bookingId: booking.id,
              originalCheckOut: booking.checkOutDate,
              newCheckOut: cycleEnd,
              additionalAmount: paidNow,
              status: "CONFIRMED",
            },
          });
        } else {
          const paidNow = payment.amount;
          const newPaidTotal = Math.min(booking.totalAmount, (booking.paidAmount || 0) + paidNow);
          const newBalance = Math.max(0, booking.totalAmount - newPaidTotal);
          const isFullyPaid = newBalance <= 0;

          // Update Booking
          await tx.booking.update({
            where: { id: booking.id },
            data: {
              bookingStatus: "CONFIRMED",
              paymentStatus: isFullyPaid ? "PAID" : "PARTIAL",
              paidAmount: newPaidTotal,
              balanceAmount: newBalance,
              qrCodeData,
              holdExpiresAt: null,
            },
          });

          // Reserve Bed
          if (booking.bedId) {
            await tx.bed.update({
              where: { id: booking.bedId },
              data: { status: "RESERVED" },
            });
          }

          // Update or Generate Invoice
          if (booking.invoices.length === 0) {
            await createInvoiceWithRetry(tx, {
              bookingId: booking.id,
              customerId: booking.customerId,
              hostelId: booking.hostelId,
              issueDate: new Date(),
              dueDate: new Date(),
              baseAmount: booking.baseAmount,
              taxAmount: booking.taxAmount,
              serviceFee: booking.serviceFee,
              securityDeposit: booking.securityDeposit,
              discountAmount: booking.discountAmount,
              totalAmount: booking.totalAmount,
              paidAmount: newPaidTotal,
              balanceDue: newBalance,
              status: isFullyPaid ? "PAID" : "PARTIAL",
            });
          } else {
            await tx.invoice.update({
              where: { id: booking.invoices[0].id },
              data: {
                status: isFullyPaid ? "PAID" : "PARTIAL",
                paidAmount: newPaidTotal,
                balanceDue: newBalance,
              },
            });
          }
        }
      });

      await logAuditAction({
        userId: booking.customerId,
        userName: booking.guestName,
        action: "PHONEPE_WEBHOOK_PAYMENT_CAPTURED",
        entity: "Booking",
        entityId: booking.id,
        newValue: {
          merchantOrderId,
          amount: booking.totalAmount,
          phonePeOrderId: event.payload.orderId,
          transactionId: txnId,
        },
      });

      return NextResponse.json({ success: true, received: true });
    }

    // 4. Handle Order Failed
    if (
      (event.event === "checkout.order.failed" || event.event === "payment.failed") &&
      state === "FAILED"
    ) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      });

      return NextResponse.json({ success: true, received: true });
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error: any) {
    console.error("PhonePe webhook processing error:", error);
    return NextResponse.json({ success: false, message: error.message || "Webhook error" }, { status: 500 });
  }
}
