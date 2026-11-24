import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import { canUserEdit } from "@/lib/permissions";
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
      ROLES.FINANCE,
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
    const remainingDiscountCycles = Math.max(0, booking.monthlyRentDiscountMonths - booking.monthlyRentDiscountCyclesApplied);
    const nextCycleDiscount = remainingDiscountCycles > 0 ? Math.min(baseRent, booking.monthlyRentDiscountAmount) : 0;
    const totalMonthlyRent = baseRent - nextCycleDiscount;

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
          maintenanceFee: 0,
          monthlyRentDiscountAmount: nextCycleDiscount,
          remainingDiscountCycles,
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
      ROLES.FINANCE,
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
    const remainingDiscountCycles = Math.max(0, booking.monthlyRentDiscountMonths - booking.monthlyRentDiscountCyclesApplied);
    const monthlyRentDiscountAmount = remainingDiscountCycles > 0 ? Math.min(baseRent, booking.monthlyRentDiscountAmount) : 0;
    const defaultRenewalAmount = baseRent - monthlyRentDiscountAmount;

    // FLOW 1: OFFLINE PAYMENT (Staff collection at reception)
    if (method === "OFFLINE") {
      if (!isStaff) {
        return NextResponse.json({ success: false, message: "Only staff can record offline payments." }, { status: 403 });
      }
      if (!canUserEdit(user)) {
        return NextResponse.json({ success: false, message: "You have view-only access and cannot record offline payments." }, { status: 403 });
      }

      const paymentMode = body.paymentMode || "CASH"; // CASH, UPI, CARD, BANK_TRANSFER
      const paidAmount = Number(body.amount);
      const notes = body.notes || "";
      const balanceDueDate = body.balanceDueDate;

      if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
        throw new PaymentFlowError("Enter a valid payment amount greater than 0.", 400);
      }

      const pastBalance = Math.max(0, booking.balanceAmount || 0);
      const totalPayable = pastBalance + defaultRenewalAmount;

      if (paidAmount > totalPayable) {
        throw new PaymentFlowError(`Payment amount cannot exceed the total outstanding of ₹${totalPayable.toLocaleString("en-IN")}.`, 400);
      }

      const customDepositAlloc = typeof body.customDepositAlloc === "number" && !isNaN(body.customDepositAlloc) && body.customDepositAlloc >= 0
        ? body.customDepositAlloc
        : undefined;
      const customPastAlloc = typeof body.customPastAlloc === "number" && !isNaN(body.customPastAlloc) && body.customPastAlloc >= 0
        ? body.customPastAlloc
        : undefined;
      const customRentAlloc = typeof body.customRentAlloc === "number" && !isNaN(body.customRentAlloc) && body.customRentAlloc >= 0
        ? body.customRentAlloc
        : undefined;

      const pendingDeposit = Math.max(0, (booking.securityDeposit || 0) - (booking.paidSecurityDeposit || 0));

      let depositAllocated = Math.min(paidAmount, pendingDeposit);
      let cashForPast = Math.min(paidAmount, pastBalance);
      let cashForCycleRent = Math.max(0, paidAmount - pastBalance);

      if (customDepositAlloc !== undefined || customPastAlloc !== undefined || customRentAlloc !== undefined) {
        depositAllocated = customDepositAlloc !== undefined ? Math.min(customDepositAlloc, pendingDeposit, paidAmount) : Math.min(paidAmount, pendingDeposit);
        const remAfterDep = Math.max(0, paidAmount - depositAllocated);
        cashForPast = customPastAlloc !== undefined ? Math.min(customPastAlloc, pastBalance, remAfterDep) : Math.min(remAfterDep, pastBalance);
        const remAfterPast = Math.max(0, remAfterDep - cashForPast);
        cashForCycleRent = customRentAlloc !== undefined ? Math.min(customRentAlloc, defaultRenewalAmount, remAfterPast) : Math.min(remAfterPast, defaultRenewalAmount);
      }

      const cycleRentBalanceDue = Math.max(0, defaultRenewalAmount - cashForCycleRent);
      const newTotalBalance = Math.max(0, totalPayable - paidAmount);

      let resolvedDueDate = cycleStart;
      if (newTotalBalance > 0) {
        if (balanceDueDate && typeof balanceDueDate === "string") {
          const parsed = new Date(`${balanceDueDate.slice(0, 10)}T18:29:59.000Z`);
          if (!isNaN(parsed.getTime())) {
            resolvedDueDate = parsed;
          } else {
            resolvedDueDate = addUtcCalendarDays(new Date(), 7);
          }
        } else {
          resolvedDueDate = addUtcCalendarDays(new Date(), 7);
        }
      }

      const result = await prisma.$transaction(async (tx) => {
        const current = await tx.booking.findUnique({ where: { id: booking.id } });
        if (!current || current.checkOutDate.getTime() !== currentCheckOut.getTime() || current.bookingStatus !== booking.bookingStatus) {
          throw new PaymentFlowError("This rent cycle has already changed. Refresh the booking and try again.");
        }

        // 1. Clear or reduce past unpaid invoices using cashForPast
        if (cashForPast > 0) {
          const pastInvoices = await tx.invoice.findMany({
            where: { bookingId: booking.id, status: { in: ["DUE", "PARTIAL"] } },
            orderBy: { createdAt: "asc" },
          });
          let remainingToClear = cashForPast;
          for (const pastInv of pastInvoices) {
            if (remainingToClear <= 0) break;
            const invDue = Math.max(0, pastInv.totalAmount - pastInv.paidAmount);
            const payThis = Math.min(remainingToClear, invDue);
            if (payThis > 0) {
              const newPaid = pastInv.paidAmount + payThis;
              const newBal = Math.max(0, pastInv.totalAmount - newPaid);
              const invDepositCredited = Math.min(payThis, Math.max(0, (pastInv.securityDeposit || 0) - (pastInv.paidSecurityDeposit || 0)));
              await tx.invoice.update({
                where: { id: pastInv.id },
                data: {
                  paidAmount: newPaid,
                  balanceDue: newBal,
                  status: newBal === 0 ? "PAID" : "PARTIAL",
                  paidSecurityDeposit: (pastInv.paidSecurityDeposit || 0) + invDepositCredited,
                },
              });
              remainingToClear -= payThis;
            }
          }
        }

        // 2. Advance booking checkOutDate and financial totals
        const updatedBooking = await tx.booking.update({
          where: { id: booking.id },
          data: {
            checkOutDate: cycleEnd,
            totalAmount: booking.totalAmount + defaultRenewalAmount,
            paidAmount: booking.paidAmount + paidAmount,
            balanceAmount: newTotalBalance,
            paidSecurityDeposit: booking.paidSecurityDeposit + depositAllocated,
            paymentStatus: newTotalBalance > 0 ? "PARTIAL" : "PAID",
            monthlyRentDiscountCyclesApplied: { increment: monthlyRentDiscountAmount > 0 ? 1 : 0 },
          },
          include: { hostel: true, room: true, bed: true },
        });

        // 3. Create invoice for the new cycle
        const invoice = await createInvoiceWithRetry(tx, {
          bookingId: booking.id,
          customerId: booking.customerId,
          hostelId: booking.hostelId,
          issueDate: new Date(),
          dueDate: cycleRentBalanceDue > 0 ? resolvedDueDate : cycleStart,
          baseAmount: baseRent,
          serviceFee: 0,
          taxAmount: 0,
          securityDeposit: 0,
          paidSecurityDeposit: 0,
          discountAmount: monthlyRentDiscountAmount,
          monthlyRentDiscountAmount,
          totalAmount: defaultRenewalAmount,
          paidAmount: cashForCycleRent,
          balanceDue: cycleRentBalanceDue,
          status: cycleRentBalanceDue === 0 ? "PAID" : cashForCycleRent > 0 ? "PARTIAL" : "DUE",
        });

        // 4. Create completed Payment record
        const paymentRecord = await tx.payment.create({
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
              monthlyRentDiscountAmount,
              depositAllocated,
              pastBalanceAllocated: cashForPast,
              cycleRentAllocated: cashForCycleRent,
              balanceDue: newTotalBalance,
              balanceDueDate: newTotalBalance > 0 ? resolvedDueDate.toISOString() : null,
              notes,
            }),
          },
        });

        // 5. Create confirmed BookingExtension
        await tx.bookingExtension.create({
          data: {
            bookingId: booking.id,
            originalCheckOut: currentCheckOut,
            newCheckOut: cycleEnd,
            additionalAmount: defaultRenewalAmount,
            status: "CONFIRMED",
          },
        });

        return { updatedBooking, invoice, paymentRecord };
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
          depositAllocated,
          pastBalanceAllocated: cashForPast,
          cycleRentAllocated: cashForCycleRent,
          balanceDue: newTotalBalance,
          balanceDueDate: newTotalBalance > 0 ? resolvedDueDate.toISOString() : null,
          newCheckOut: cycleEnd.toISOString(),
          invoiceNumber: result.invoice.invoiceNumber,
          monthlyRentDiscountAmount,
          notes,
        },
      });

      const message = newTotalBalance > 0
        ? `Payment of ₹${paidAmount.toLocaleString("en-IN")} recorded. Remaining balance ₹${newTotalBalance.toLocaleString("en-IN")} due by ${resolvedDueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}. Stay extended to ${cycleEnd.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}.`
        : `Payment of ₹${paidAmount.toLocaleString("en-IN")} recorded. Stay extended to ${cycleEnd.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} with all balances settled.`;

      return NextResponse.json({
        success: true,
        message,
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
        serviceFee: 0,
        taxAmount: 0,
        securityDeposit: 0,
        discountAmount: monthlyRentDiscountAmount,
        monthlyRentDiscountAmount,
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
            maintenanceFee: 0,
            monthlyRentDiscountAmount,
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
