import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { generateBookingQRCode } from "@/lib/qr";
import { generateUniqueInvoiceNumber } from "@/lib/invoice";
import { logAuditAction } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const {
      bookingId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      paymentMethod = "upi",
    } = await req.json();

    if (!bookingId || !razorpayOrderId || !razorpayPaymentId) {
      return NextResponse.json(
        { success: false, message: "Missing payment confirmation parameters" },
        { status: 400 }
      );
    }

    // Verify signature
    const isValid = verifyPaymentSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature || "sim_sig_test",
    });

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: "Invalid payment gateway signature" },
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

    // Handle balance payment for confirmed bookings (e.g., from booking extensions)
    if (booking.bookingStatus === "CONFIRMED" && booking.balanceAmount > 0) {
      // This is a balance payment (e.g., from extension)
      const updatedBooking = await prisma.$transaction(async (tx) => {
        // 1. Create Payment record
        const payment = await tx.payment.create({
          data: {
            bookingId: booking.id,
            customerId: booking.customerId,
            amount: booking.balanceAmount,
            currency: "INR",
            gateway: "RAZORPAY",
            gatewayPaymentId: razorpayPaymentId,
            gatewayOrderId: razorpayOrderId,
            gatewaySignature: razorpaySignature,
            status: "CAPTURED",
            paymentMethod,
          },
        });

        // 2. Update Booking - add balance to paid amount
        const updatedBook = await tx.booking.update({
          where: { id: booking.id },
          data: {
            paidAmount: booking.paidAmount + booking.balanceAmount,
            balanceAmount: 0,
            paymentStatus: "PAID",
          },
          include: {
            hostel: true,
            room: { include: { roomType: true } },
            bed: true,
            payments: true,
          },
        });

        // 3. Update Invoice if exists
        const invoice = await tx.invoice.findFirst({
          where: { bookingId: booking.id },
        });

        if (invoice && invoice.status === "PARTIAL") {
          await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              paidAmount: invoice.paidAmount + booking.balanceAmount,
              status: "PAID",
            },
          });
        }

        return updatedBook;
      });

      // Log Audit action
      await logAuditAction({
        userId: booking.customerId,
        userName: booking.guestName,
        action: "BALANCE_PAYMENT_CAPTURED",
        entity: "Booking",
        entityId: booking.id,
        newValue: {
          bookingRef: booking.bookingReference,
          balanceAmount: booking.balanceAmount,
          gatewayPaymentId: razorpayPaymentId,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Balance payment captured successfully!",
        data: {
          booking: updatedBooking,
        },
      });
    }

    if (booking.bookingStatus !== "PAYMENT_PENDING") {
      return NextResponse.json(
        { success: false, message: "This booking is no longer awaiting payment" },
        { status: 409 }
      );
    }

    if (booking.holdExpiresAt && booking.holdExpiresAt <= new Date()) {
      return NextResponse.json(
        { success: false, message: "Payment session has expired. Please create a new booking." },
        { status: 410 }
      );
    }

    // Generate QR Code data URL
    const qrCodeData = await generateBookingQRCode(
      booking.bookingReference,
      booking.id
    );

    // Generate Invoice Number
    const invoiceNumber = await generateUniqueInvoiceNumber();

    // Transactional confirmation
    const updatedBooking = await prisma.$transaction(async (tx) => {
      // 1. Create Payment record
      const payment = await tx.payment.create({
        data: {
          bookingId: booking.id,
          customerId: booking.customerId,
          amount: booking.totalAmount,
          currency: "INR",
          gateway: "RAZORPAY",
          gatewayPaymentId: razorpayPaymentId,
          gatewayOrderId: razorpayOrderId,
          gatewaySignature: razorpaySignature,
          status: "CAPTURED",
          paymentMethod,
        },
      });

      // 2. Update Booking
      const confirmed = await tx.booking.update({
        where: { id: booking.id },
        data: {
          bookingStatus: "CONFIRMED",
          paymentStatus: "PAID",
          paidAmount: booking.totalAmount,
          balanceAmount: 0,
          qrCodeData,
          holdExpiresAt: null, // clear hold
        },
        include: {
          hostel: true,
          room: { include: { roomType: true } },
          bed: true,
          payments: true,
        },
      });

      // 3. Mark Bed as Reserved
      await tx.bed.update({
        where: { id: booking.bedId },
        data: { status: "RESERVED" },
      });

      // 4. Generate Invoice
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

      return confirmed;
    });

    // Log Audit action
    await logAuditAction({
      userId: booking.customerId,
      userName: booking.guestName,
      action: "BOOKING_CONFIRMED_PAYMENT_CAPTURED",
      entity: "Booking",
      entityId: booking.id,
      newValue: {
        bookingRef: booking.bookingReference,
        amount: booking.totalAmount,
        gatewayPaymentId: razorpayPaymentId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Payment captured successfully! Booking is confirmed.",
      data: {
        booking: updatedBooking,
        invoiceNumber,
      },
    });
  } catch (error: any) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Payment verification failed" },
      { status: 500 }
    );
  }
}
