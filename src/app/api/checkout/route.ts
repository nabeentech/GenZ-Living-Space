import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";
import { createInvoiceWithRetry } from "@/lib/invoice";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (
      !user ||
      !hasPermission(user.role, [
        ROLES.SUPER_ADMIN,
        ROLES.PROPERTY_MANAGER,
        ROLES.RECEPTIONIST,
      ])
    ) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Staff access required." },
        { status: 403 }
      );
    }

    const { bookingId, additionalCharges = [], collectedAmount: rawCollectedAmount = 0, paymentMethod = "cash" } = await req.json();
    const collectedAmount = Number(rawCollectedAmount);
    const collectedPaise = Math.round(collectedAmount * 100);

    if (!bookingId) {
      return NextResponse.json(
        { success: false, message: "bookingId is required" },
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

    if (!Array.isArray(additionalCharges) || additionalCharges.length > 50) {
      return NextResponse.json({ success: false, message: "Invalid additional charge list." }, { status: 400 });
    }
    if (!Number.isFinite(collectedAmount) || !Number.isSafeInteger(collectedPaise) || collectedPaise < 0 || Math.abs(collectedAmount * 100 - collectedPaise) > 0.0001) {
      return NextResponse.json({ success: false, message: "Enter a valid amount collected at checkout." }, { status: 400 });
    }
    const allowedPaymentMethods = new Set(["cash", "upi", "card", "bank_transfer", "offline_prepaid"]);
    if (collectedPaise > 0 && !allowedPaymentMethods.has(paymentMethod)) {
      return NextResponse.json({ success: false, message: "Choose a valid payment method for the amount collected." }, { status: 400 });
    }
    const allowedCategories = new Set(["LAUNDRY", "FOOD", "LOST_KEY", "DAMAGE", "LATE_CHECKOUT", "OTHER"]);
    for (const charge of additionalCharges) {
      const chargeAmount = Number(charge?.amount);
      if (!Number.isFinite(chargeAmount) || chargeAmount <= 0 || Math.abs(Math.round(chargeAmount * 100) / 100 - chargeAmount) > 1e-8) {
        return NextResponse.json({ success: false, message: "Each additional charge must be a positive amount with up to two decimal places." }, { status: 400 });
      }
      if (charge.category && !allowedCategories.has(charge.category)) {
        return NextResponse.json({ success: false, message: "Choose a valid additional charge category." }, { status: 400 });
      }
      if (charge.description && (typeof charge.description !== "string" || charge.description.length > 200)) {
        return NextResponse.json({ success: false, message: "Charge descriptions must be 200 characters or fewer." }, { status: 400 });
      }
    }

    if (booking.bookingStatus !== "CHECKED_IN") {
      return NextResponse.json(
        { success: false, message: "Only checked-in bookings can be checked out" },
        { status: 400 }
      );
    }

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const currentBooking = await tx.booking.findUnique({ where: { id: booking.id } });
      if (!currentBooking || currentBooking.bookingStatus !== "CHECKED_IN") {
        throw Object.assign(new Error("This booking has already been checked out or is no longer active."), { status: 409 });
      }
      // 1. Add any additional charges if passed
      let extraTotal = 0;
      for (const charge of additionalCharges) {
        const amount = Number(charge.amount);
        await tx.additionalCharge.create({
          data: {
            bookingId: booking.id,
            category: charge.category || "OTHER",
            description: charge.description?.trim() || "Additional charge at checkout",
            amount,
            status: "PENDING",
            addedBy: user.name,
          },
        });
        extraTotal = Math.round((extraTotal + amount) * 100) / 100;
      }

      // 2. Prepare invoices for the original balance and any new checkout charges.
      const updatedBalancePaise = Math.round((currentBooking.balanceAmount + extraTotal) * 100);
      const bookingBalancePaise = Math.max(0, Math.round((currentBooking.totalAmount - currentBooking.paidAmount) * 100));
      if (bookingBalancePaise !== Math.round(currentBooking.balanceAmount * 100)) {
        throw Object.assign(new Error("Reservation paid and due totals do not balance. Ask Finance to reconcile before checkout."), { status: 409 });
      }
      if (collectedPaise > updatedBalancePaise) {
        throw Object.assign(new Error(`Amount collected cannot exceed the checkout balance of ₹${(updatedBalancePaise / 100).toLocaleString("en-IN")}.`), { status: 400 });
      }

      const invoices = await tx.invoice.findMany({ where: { bookingId: booking.id }, orderBy: { createdAt: "asc" } });
      if (invoices.length === 0) {
        await createInvoiceWithRetry(tx, {
          bookingId: booking.id,
          customerId: booking.customerId,
          hostelId: booking.hostelId,
          issueDate: now,
          dueDate: now,
          baseAmount: currentBooking.baseAmount,
          taxAmount: currentBooking.taxAmount,
          totalAmount: currentBooking.totalAmount,
          paidAmount: currentBooking.paidAmount,
          balanceDue: currentBooking.balanceAmount,
          status: currentBooking.balanceAmount === 0 ? "PAID" : currentBooking.paidAmount > 0 ? "PARTIAL" : "DUE",
        });
      }
      if (extraTotal > 0) {
        await createInvoiceWithRetry(tx, {
          bookingId: booking.id,
          customerId: booking.customerId,
          hostelId: booking.hostelId,
          issueDate: now,
          dueDate: now,
          baseAmount: extraTotal,
          taxAmount: 0,
          totalAmount: extraTotal,
          paidAmount: 0,
          balanceDue: extraTotal,
          status: "DUE",
        });
      }

      let paymentRemainderPaise = collectedPaise;
      const currentInvoices = await tx.invoice.findMany({ where: { bookingId: booking.id, status: { not: "CANCELLED" } }, orderBy: { createdAt: "asc" } });
      const ledgerDuePaise = currentInvoices.reduce((total, invoice) => total + Math.max(0, Math.round((invoice.totalAmount - invoice.paidAmount) * 100)), 0);
      if (ledgerDuePaise !== updatedBalancePaise) {
        throw Object.assign(new Error("Checkout invoice balances do not match the booking. Ask Finance to reconcile before completing checkout."), { status: 409 });
      }
      for (const invoice of currentInvoices) {
        const invoiceDuePaise = Math.max(0, Math.round((invoice.totalAmount - invoice.paidAmount) * 100));
        const appliedPaise = Math.min(paymentRemainderPaise, invoiceDuePaise);
        if (!appliedPaise) continue;
        const paidPaise = Math.round(invoice.paidAmount * 100) + appliedPaise;
        const invoiceBalancePaise = Math.max(0, Math.round(invoice.totalAmount * 100) - paidPaise);
        await tx.invoice.update({ where: { id: invoice.id }, data: {
          paidAmount: paidPaise / 100,
          balanceDue: invoiceBalancePaise / 100,
          status: invoiceBalancePaise === 0 ? "PAID" : "PARTIAL",
        } });
        paymentRemainderPaise -= appliedPaise;
      }
      if (paymentRemainderPaise > 0) throw Object.assign(new Error("Checkout invoice balances do not match the booking. Ask Finance to review this reservation."), { status: 409 });

      const finalBalancePaise = updatedBalancePaise - collectedPaise;
      const finalPaidAmount = Math.round((currentBooking.paidAmount * 100 + collectedPaise)) / 100;
      const checkedOut = await tx.booking.updateMany({
        where: { id: booking.id, bookingStatus: "CHECKED_IN" },
        data: {
          bookingStatus: "CHECKED_OUT",
          checkOutTime: now,
          checkedOutBy: user.name,
          totalAmount: { increment: extraTotal },
          paidAmount: finalPaidAmount,
          balanceAmount: finalBalancePaise / 100,
          paymentStatus: finalBalancePaise === 0 ? "PAID" : finalPaidAmount > 0 ? "PARTIAL" : "PENDING",
        },
      });
      if (checkedOut.count !== 1) throw Object.assign(new Error("This guest was checked out by another staff member. Refresh the desk."), { status: 409 });
      const b = await tx.booking.findUniqueOrThrow({ where: { id: booking.id }, include: { hostel: true, room: true, bed: true } });

      if (collectedPaise > 0) {
        await tx.payment.create({ data: {
          bookingId: booking.id,
          customerId: booking.customerId,
          amount: collectedPaise / 100,
          currency: "INR",
          gateway: paymentMethod.toUpperCase(),
          gatewayPaymentId: `checkout_pay_${Date.now()}`,
          status: "CAPTURED",
          paymentMethod,
        } });
      }
      if (finalBalancePaise === 0) {
        await tx.additionalCharge.updateMany({ where: { bookingId: booking.id, status: "PENDING" }, data: { status: "PAID" } });
      }

      // 3. Mark Bed status as CLEANING and release current occupant
      await tx.bed.update({
        where: { id: booking.bedId },
        data: {
          status: "CLEANING",
          currentOccupantId: null,
        },
      });

      // 4. Automatically trigger Housekeeping task
      await tx.housekeepingTask.create({
        data: {
          hostelId: booking.hostelId,
          roomId: booking.roomId,
          bedId: booking.bedId,
          taskType: "DEEP_CLEAN",
          status: "DIRTY",
          notes: `Automatic checkout clean task for guest ${booking.guestName}. Check-out by ${user.name}.`,
        },
      });

      return b;
    });

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: "GUEST_CHECKED_OUT",
      entity: "Booking",
      entityId: booking.id,
      newValue: {
        checkedOutBy: user.name,
        time: now.toISOString(),
        bed: booking.bed.bedNumber,
        collectedAmount: collectedPaise / 100,
        remainingBalance: updated.balanceAmount,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Check-out completed for ${booking.guestName}. Bed ${booking.bed.bedNumber} is queued for Housekeeping.${collectedPaise > 0 ? ` ₹${(collectedPaise / 100).toLocaleString("en-IN")} received.` : ""}${updated.balanceAmount > 0 ? ` Outstanding balance ₹${updated.balanceAmount.toLocaleString("en-IN")} is still due.` : " Balance settled."}`,
      data: updated,
    });
  } catch (error: any) {
    console.error("Check-out error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to process check-out" },
      { status: error.status || 500 }
    );
  }
}
