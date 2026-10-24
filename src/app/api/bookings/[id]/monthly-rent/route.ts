import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import { addUtcCalendarDays, getRoomTypePriceRates } from "@/lib/pricing";
import { generateUniqueInvoiceNumber } from "@/lib/invoice";
import { createPayment } from "@/lib/phonepe";
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
    return NextResponse.json({ success: false, message: error.message || "Failed to load monthly rent details" }, { status: 500 });
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
      const invoiceNumber = await generateUniqueInvoiceNumber();

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
        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber,
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
          },
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
              invoiceNumber,
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
          invoiceNumber,
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
    const invoiceNumber = await generateUniqueInvoiceNumber();

    const baseOrigin =
      process.env.APP_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";
    const cleanOrigin = baseOrigin.replace(/\/+$/, "");

    const cleanRef = booking.bookingReference.replace(/[^A-Za-z0-9_-]/g, "");
    const merchantOrderId = `GZLS_RENT_${cleanRef}_${Date.now().toString(36)}`;

    // Create a DUE invoice for the upcoming cycle
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
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
      },
    });

    // Create a PENDING payment record
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
          type: "MONTHLY_RENT",
          bookingId: booking.id,
          bookingReference: booking.bookingReference,
          cycleStart: cycleStart.toISOString(),
          cycleEnd: cycleEnd.toISOString(),
          invoiceNumber,
          invoiceId: invoice.id,
          baseRent,
          maintenanceFee,
          totalMonthlyRent: paymentAmount,
        }),
      },
    });

    // Initiate PhonePe hosted checkout
    const checkout = await createPayment({
      merchantOrderId,
      amount: amountInPaise,
      redirectUrl: `${cleanOrigin}/payment/return?merchantOrderId=${encodeURIComponent(merchantOrderId)}`,
      metaInfo: {
        udf1: booking.id,
        udf2: "monthly-rent-renewal",
      },
    });

    // Update with PhonePe order ID
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
        paymentAmount,
        invoiceNumber,
        cycleStart,
        cycleEnd,
      },
    });
  } catch (error: any) {
    console.error("Monthly rent POST error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to initiate monthly rent payment" },
      { status: 500 }
    );
  }
}
