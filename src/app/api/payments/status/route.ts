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
  if (payment.status === "COMPLETED" && payment.booking?.bookingStatus === "CONFIRMED") {
    return NextResponse.json({
      success: true,
      state: "COMPLETED",
      bookingId: payment.bookingId,
      bookingReference: payment.booking.bookingReference,
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

    await prisma.$transaction(async (tx) => {
      // 1. Mark Payment as completed
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "COMPLETED",
          gatewayPaymentId: txnId,
          paymentMethod: paymentMode,
        },
      });

      // 2. Mark Booking as Confirmed & Paid
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          bookingStatus: "CONFIRMED",
          paymentStatus: "PAID",
          paidAmount: booking.totalAmount,
          balanceAmount: 0,
          qrCodeData,
          holdExpiresAt: null,
        },
      });

      // 3. Mark Bed as Reserved
      await tx.bed.update({
        where: { id: booking.bedId },
        data: { status: "RESERVED" },
      });

      // 4. Generate Invoice if missing
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
            paidAmount: booking.totalAmount,
            status: "PAID",
          },
        });
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
