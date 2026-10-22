import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPaymentSignature, verifyCapturedPayment } from "@/lib/razorpay";
import { generateBookingQRCode } from "@/lib/qr";
import { generateUniqueInvoiceNumber } from "@/lib/invoice";
import { logAuditAction } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "CUSTOMER") {
      return NextResponse.json({ success: false, message: "Please sign in to complete payment." }, { status: 401 });
    }
    const body = await req.json();
    const {
      bookingId,
      merchantOrderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      paymentMethod = "upi",
    } = body;

    if (merchantOrderId) {
      const baseOrigin = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const statusRes = await fetch(`${baseOrigin.replace(/\/+$/, "")}/api/payments/status?merchantOrderId=${encodeURIComponent(merchantOrderId)}`);
      const statusJson = await statusRes.json();
      return NextResponse.json(statusJson, { status: statusRes.status });
    }

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
    if (booking.customerId !== user.id) {
      return NextResponse.json({ success: false, message: "You cannot pay for this booking." }, { status: 403 });
    }

    const expectedAmount = booking.bookingStatus === "CONFIRMED"
      ? booking.balanceAmount
      : booking.totalAmount;
    const isLocalSimulator = process.env.NODE_ENV !== "production" &&
      razorpaySignature === "sim_sig_valid_2026" &&
      razorpayOrderId.startsWith("order_gz_") &&
      razorpayPaymentId.startsWith("pay_sim_");
    if (!isLocalSimulator && !(await verifyCapturedPayment({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      expectedAmount,
    }))) {
      return NextResponse.json(
        { success: false, message: "Payment was not captured for the expected booking amount." },
        { status: 400 }
      );
    }

    // Handle balance payment for confirmed bookings (e.g., from booking extensions)
    if (booking.bookingStatus === "CONFIRMED" && booking.balanceAmount > 0) {
      // Check if this is an extension payment
      const extension = await prisma.bookingExtension.findFirst({
        where: { bookingId: booking.id, status: "REQUESTED" },
      });

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

        let updateData: any = {
          paidAmount: booking.paidAmount + booking.balanceAmount,
          balanceAmount: 0,
          paymentStatus: "PAID",
        };

        // If this is an extension payment, update the checkout date and pricing
        if (extension) {
          updateData = {
            ...updateData,
            checkOutDate: extension.newCheckOut,
            // Re-fetch the pricing to get updated values (would need to recalculate or store them)
          };
        }

        // 2. Update Booking
        const updatedBook = await tx.booking.update({
          where: { id: booking.id },
          data: updateData,
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

        // 4. If extension, mark it as confirmed
        if (extension) {
          await tx.bookingExtension.update({
            where: { id: extension.id },
            data: { status: "CONFIRMED" },
          });
        }

        return updatedBook;
      });

      // Log Audit action
      await logAuditAction({
        userId: booking.customerId,
        userName: booking.guestName,
        action: extension ? "EXTENSION_PAYMENT_CAPTURED" : "BALANCE_PAYMENT_CAPTURED",
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
        message: extension ? "Extension confirmed!" : "Balance payment captured successfully!",
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
