import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkOrderStatus } from "@/lib/phonepe";
import { generateBookingQRCode } from "@/lib/qr";
import { generateUniqueInvoiceNumber } from "@/lib/invoice";
import { logAuditAction } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const merchantOrderId = searchParams.get("merchantOrderId");

    if (!merchantOrderId) {
      return NextResponse.json(
        { success: false, message: "merchantOrderId query parameter is required" },
        { status: 400 }
      );
    }

    return await handleOrderStatusVerification(merchantOrderId);
  } catch (error: any) {
    console.error("Order status check error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to check payment status" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const merchantOrderId = body.merchantOrderId;

    if (!merchantOrderId) {
      return NextResponse.json(
        { success: false, message: "merchantOrderId is required" },
        { status: 400 }
      );
    }

    return await handleOrderStatusVerification(merchantOrderId);
  } catch (error: any) {
    console.error("Order status check error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to check payment status" },
      { status: 500 }
    );
  }
}

async function handleOrderStatusVerification(merchantOrderId: string) {
  const payment = await prisma.payment.findFirst({
    where: { gatewayOrderId: merchantOrderId },
    include: { booking: true },
  });

  if (!payment) {
    return NextResponse.json(
      { success: false, message: "Payment transaction record not found" },
      { status: 404 }
    );
  }

  // If already confirmed and completed in database, return immediately
  if (payment.status === "COMPLETED") {
    return NextResponse.json({
      success: true,
      state: "COMPLETED",
      bookingId: payment.bookingId,
      bookingReference: payment.booking?.bookingReference,
      amount: payment.amount,
      message: "Payment verified successfully.",
    });
  }

  // Check authoritative status with PhonePe
  const phonePeStatus = await checkOrderStatus(merchantOrderId);
  const state = phonePeStatus.state;

  if (state === "COMPLETED") {
    const txnDetail = phonePeStatus.paymentDetails?.find((p) => p.state === "COMPLETED");
    const txnId = txnDetail?.transactionId || phonePeStatus.orderId;
    const paymentMode = txnDetail?.paymentMode || "PHONEPE_UPI";

    const booking = await prisma.booking.findUnique({
      where: { id: payment.bookingId },
      include: { hostel: true, room: true, bed: true, invoices: true },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Associated booking not found" },
        { status: 404 }
      );
    }

    const qrCodeData = await generateBookingQRCode(booking.bookingReference, booking.id);
    const invoiceNumber = await generateUniqueInvoiceNumber();

    let meta: any = {};
    try {
      meta = payment.metadata ? JSON.parse(payment.metadata) : {};
    } catch {}

    await prisma.$transaction(async (tx) => {
      // 1. Atomic check: only update if still PENDING to prevent double-credit race conditions
      const updated = await tx.payment.updateMany({
        where: { id: payment.id, status: "PENDING" },
        data: {
          status: "COMPLETED",
          gatewayPaymentId: txnId,
          paymentMethod: paymentMode,
        },
      });

      if (updated.count === 0) {
        // Already processed by concurrent request or webhook
        return;
      }

      if (meta.type === "MONTHLY_RENT") {
        const cycleEnd = meta.cycleEnd
          ? new Date(meta.cycleEnd)
          : new Date(new Date(booking.checkOutDate).getTime() + 30 * 24 * 60 * 60 * 1000);
        const paidNow = payment.amount;

        // 2. Advance booking checkOutDate and financial totals
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            checkOutDate: cycleEnd,
            paidAmount: (booking.paidAmount || 0) + paidNow,
            totalAmount: (booking.totalAmount || 0) + paidNow,
            paymentStatus: "PAID",
          },
        });

        // 3. Mark the cycle invoice as PAID
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

        // 4. Create confirmed booking extension
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

        // 2. Mark Booking as Confirmed & Paid
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

        // 3. Mark Bed as Reserved
        if (booking.bedId) {
          await tx.bed.update({
            where: { id: booking.bedId },
            data: { status: "RESERVED" },
          });
        }

        // 4. Update or Generate Invoice
        if (booking.invoices.length === 0) {
          await tx.invoice.create({
            data: {
              invoiceNumber,
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
            },
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
      action: "PHONEPE_PAYMENT_VERIFIED_CONFIRMED",
      entity: "Booking",
      entityId: booking.id,
      newValue: {
        merchantOrderId,
        amount: booking.totalAmount,
        phonePeOrderId: phonePeStatus.orderId,
        transactionId: txnId,
      },
    });

    return NextResponse.json({
      success: true,
      state: "COMPLETED",
      bookingId: booking.id,
      bookingReference: booking.bookingReference,
      amount: booking.totalAmount,
      message: "Payment verified successfully! Booking is confirmed.",
    });
  }

  if (state === "PENDING") {
    return NextResponse.json({
      success: true,
      state: "PENDING",
      bookingId: payment.bookingId,
      message: "Payment is currently pending confirmation from your bank.",
    });
  }

  // FAILED state
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "FAILED" },
  });

  return NextResponse.json({
    success: false,
    state: "FAILED",
    bookingId: payment.bookingId,
    message: "Payment was not successful. Please retry your reservation.",
  });
}
