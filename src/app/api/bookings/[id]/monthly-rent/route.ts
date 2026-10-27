import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import { addUtcCalendarDays, getRoomTypePriceRates } from "@/lib/pricing";
import { createInvoiceWithRetry } from "@/lib/invoice";
import { claimPhonePeAttempt } from "@/lib/payment-initiation";
import { paymentTransaction, paymentMetadata, PaymentFlowError } from "@/lib/payment-reconciliation";
import { sendPhonePePayment } from "@/lib/phonepe-payment";
import { diagnostic } from "@/lib/phonepe";
import { logAuditAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId } = await params;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        hostel: true,
        room: { include: { roomType: true } },
        bed: true,
        invoices: { orderBy: { issueDate: "desc" } },
        extensions: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
    }

    const isStaff = hasPermission(user.role, [
      ROLES.SUPER_ADMIN,
      ROLES.PROPERTY_MANAGER,
      ROLES.RECEPTIONIST,
    ]);

    if (!isStaff && booking.customerId !== user.id) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    if (booking.stayType !== "MONTHLY") {
      return NextResponse.json({ success: false, message: "This booking is not a monthly stay." }, { status: 400 });
    }

    const now = new Date();
    const currentCheckOut = new Date(booking.checkOutDate);
    const nextCycleStart = currentCheckOut;
    const nextCycleEnd = addUtcCalendarDays(currentCheckOut, 30);

    const diffMs = currentCheckOut.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    // Due if within 7 days or already expired
    const isDue = daysRemaining <= 7;

    const rates = getRoomTypePriceRates(booking.room.roomType, booking.room.isAC);
    const baseRent = rates.days30 || booking.baseAmount;
    const maintenanceFee = (booking.room.roomType as any).maintenanceFee || booking.serviceFee || 2000;
    const totalMonthlyRent = baseRent + maintenanceFee;

    return NextResponse.json({
      success: true,
      data: {
        bookingId: booking.id,
        bookingReference: booking.bookingReference,
        isOpenEnded: booking.isOpenEnded,
        isNoticeServed: !booking.isOpenEnded,
        currentCheckIn: booking.checkInDate,
        currentCheckOut: booking.checkOutDate,
        nextCycleStart,
        nextCycleEnd,
        daysRemaining,
        isDue,
        rates: {
          baseRent,
          maintenanceFee,
          taxAmount: 0,
          totalMonthlyRent,
        },
        invoices: booking.invoices,
        extensions: booking.extensions,
      },
    });
  } catch (error: any) {
    console.error("Monthly rent GET error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to load monthly rent details" }, { status: error instanceof PaymentFlowError ? error.status : 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { id: bookingId } = await params;
    const body = await req.json().catch(() => ({}));
    const method = body.method || "PHONEPE"; // "PHONEPE" | "OFFLINE"

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        hostel: true,
        room: { include: { roomType: true } },
        bed: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
    }

    const isStaff = hasPermission(user.role, [
      ROLES.SUPER_ADMIN,
      ROLES.PROPERTY_MANAGER,
      ROLES.RECEPTIONIST,
    ]);

    if (!isStaff && booking.customerId !== user.id) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    if (booking.stayType !== "MONTHLY") {
      return NextResponse.json({ success: false, message: "Only monthly residents can renew monthly rent." }, { status: 400 });
    }

    if (!["CONFIRMED", "CHECKED_IN"].includes(booking.bookingStatus)) {
      return NextResponse.json({ success: false, message: "Only active resident bookings can be renewed." }, { status: 400 });
    }

    const currentCheckOut = new Date(booking.checkOutDate);
    const cycleStart = currentCheckOut;
    const cycleEnd = addUtcCalendarDays(currentCheckOut, 30);

    const rates = getRoomTypePriceRates(booking.room.roomType, booking.room.isAC);
    const baseRent = rates.days30 || booking.baseAmount;
    const maintenanceFee = (booking.room.roomType as any).maintenanceFee || booking.serviceFee || 2000;
    const defaultRenewalAmount = baseRent + maintenanceFee;

    // FLOW 1: OFFLINE PAYMENT (Staff collection at reception)
    if (method === "OFFLINE") {
      if (!isStaff) {
        return NextResponse.json({ success: false, message: "Only staff can record offline payments." }, { status: 403 });
      }

      const paymentMode = body.paymentMode || "CASH"; // CASH, UPI, CARD, BANK_TRANSFER
      const paidAmount = Number(body.amount) || defaultRenewalAmount;
      const notes = body.notes || "";

      const result = await prisma.$transaction(async (tx) => {
        // 1. Advance booking checkOutDate and financial totals
        const updatedBooking = await tx.booking.update({
          where: { id: booking.id },
          data: {
            checkOutDate: cycleEnd,
            totalAmount: booking.totalAmount + paidAmount,
            paidAmount: booking.paidAmount + paidAmount,
            paymentStatus: "PAID",
          },
          include: { hostel: true, room: true, bed: true },
        });

        // 2. Create paid Invoice for this cycle
        const invoice = await createInvoiceWithRetry(tx, {
          bookingId: booking.id,
          customerId: booking.customerId,
          hostelId: booking.hostelId,
          issueDate: new Date(),
          dueDate: cycleStart,
          baseAmount: baseRent,
          serviceFee: maintenanceFee,
          taxAmount: 0,
          securityDeposit: 0,
          discountAmount: 0,
          totalAmount: paidAmount,
          paidAmount: paidAmount,
          balanceDue: 0,
          status: "PAID",
        });

        // 3. Create completed Payment record
        await tx.payment.create({
          data: {
            bookingId: booking.id,
            customerId: booking.customerId,
            amount: paidAmount,
            currency: "INR",
            gateway: paymentMode,
            gatewayPaymentId: `offline_${paymentMode.toLowerCase()}_${Date.now()}`,
            status: "COMPLETED",
            paymentMethod: paymentMode.toLowerCase(),
            metadata: JSON.stringify({
              type: "MONTHLY_RENT_OFFLINE",
              collectedBy: user.name,
              staffRole: user.role,
              cycleStart: cycleStart.toISOString(),
              cycleEnd: cycleEnd.toISOString(),
              invoiceNumber: invoice.invoiceNumber,
              notes,
            }),
          },
        });

        // 4. Create confirmed BookingExtension
        await tx.bookingExtension.create({
          data: {
            bookingId: booking.id,
            originalCheckOut: currentCheckOut,
            newCheckOut: cycleEnd,
            additionalAmount: paidAmount,
            status: "CONFIRMED",
          },
        });

        return { updatedBooking, invoice };
      });

      await logAuditAction({
        userId: user.id,
        userName: user.name,
        action: "MONTHLY_RENT_OFFLINE_RECORDED",
        entity: "Booking",
        entityId: booking.id,
        newValue: {
          paymentMode,
          amount: paidAmount,
          newCheckOut: cycleEnd.toISOString(),
          invoiceNumber: result.invoice.invoiceNumber,
          notes,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Offline monthly rent of Rs. ${paidAmount.toLocaleString()} recorded. Stay extended to ${cycleEnd.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}.`,
        data: result,
      });
    }

    // FLOW 2: ONLINE PAYMENT VIA PHONEPE
    const paymentAmount = defaultRenewalAmount;
    const amountInPaise = Math.round(paymentAmount * 100);
    if (!Number.isSafeInteger(amountInPaise) || amountInPaise < 100) throw new PaymentFlowError("Invalid monthly rent amount", 400);

    const baseOrigin =
      process.env.APP_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";
    const cleanOrigin = baseOrigin.replace(/\/+$/, "");

    const merchantOrderId = `GZLS_RENT_${crypto.randomUUID()}`;

    const { invoice, paymentRecord } = await paymentTransaction(prisma, async tx => {
      await claimPhonePeAttempt(tx, booking.id, cycleStart);
      const priorAttempts = await tx.payment.findMany({ where: { bookingId: booking.id, gateway: "PHONEPE" }, orderBy: { createdAt: "desc" } });
      const priorCycle = priorAttempts.map(item => paymentMetadata(item.metadata)).find(meta => meta.type === "MONTHLY_RENT" && meta.cycleStart === cycleStart.toISOString());
      const existingInvoice = priorCycle?.invoiceId ? await tx.invoice.findUnique({ where: { id: priorCycle.invoiceId } }) : null;
      if (existingInvoice && (existingInvoice.status !== "DUE" || Math.round(existingInvoice.totalAmount * 100) !== amountInPaise)) throw new PaymentFlowError("Rent invoice changed; contact support");
      const invoice = existingInvoice || await createInvoiceWithRetry(tx, {
        bookingId: booking.id,
        customerId: booking.customerId,
        hostelId: booking.hostelId,
        issueDate: new Date(),
        dueDate: cycleStart,
        baseAmount: baseRent,
        serviceFee: maintenanceFee,
        taxAmount: 0,
        securityDeposit: 0,
        discountAmount: 0,
        totalAmount: paymentAmount,
        paidAmount: 0,
        balanceDue: paymentAmount,
        status: "DUE",
      });

      // Create a PENDING payment record
      const paymentRecord = await tx.payment.create({
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
            type: "MONTHLY_RENT",
            bookingId: booking.id,
            bookingReference: booking.bookingReference,
            cycleStart: cycleStart.toISOString(),
            cycleEnd: cycleEnd.toISOString(),
            invoiceNumber: invoice.invoiceNumber,
            invoiceId: invoice.id,
            baseRent,
            maintenanceFee,
            totalMonthlyRent: paymentAmount,
          }),
        },
      });

      return { invoice, paymentRecord };
    });
    diagnostic("payment.initiated", { merchantOrderId, amountPaise: amountInPaise, flow: "MONTHLY_RENT" });

    // Initiate PhonePe hosted checkout
    const checkout = await sendPhonePePayment(paymentRecord, {
      merchantOrderId,
      amount: amountInPaise,
      redirectUrl: `${cleanOrigin}/payment/return?merchantOrderId=${encodeURIComponent(merchantOrderId)}`,
      metaInfo: {
        udf1: booking.id,
        udf2: "monthly-rent-renewal",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        merchantOrderId,
        redirectUrl: checkout.redirectUrl,
        orderId: checkout.orderId,
        bookingReference: booking.bookingReference,
        paymentAmount,
        invoiceNumber: invoice.invoiceNumber,
        cycleStart,
        cycleEnd,
      },
    });
  } catch (error: any) {
    diagnostic("checkout.failed", { reason: error instanceof PaymentFlowError ? "BOOKING_VALIDATION_FAILED" : "INITIATION_UNAVAILABLE" });
    return NextResponse.json(
      { success: false, message: error instanceof PaymentFlowError ? error.message : "Unable to initiate rent payment. Check existing payment status before retrying." },
      { status: error instanceof PaymentFlowError ? error.status : 500 }
    );
  }
}
