import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";
import { createInvoiceWithRetry } from "@/lib/invoice";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, [ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER, ROLES.RECEPTIONIST])) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Staff access required." },
        { status: 403 }
      );
    }

    const { bookingReference, bookingId, guestGovtId, guestGovtIdVerified, settlePayment, paymentMethod } = await req.json();

    if (!bookingReference && !bookingId) {
      return NextResponse.json(
        { success: false, message: "bookingReference or bookingId is required" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findFirst({
      where: {
        OR: [
          ...(bookingReference ? [{ bookingReference }] : []),
          ...(bookingId ? [{ id: bookingId }] : []),
        ],
      },
      include: { hostel: true, room: { include: { roomType: true } }, bed: true },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found for this reference" },
        { status: 404 }
      );
    }

    if (booking.bookingStatus !== "CONFIRMED") {
      return NextResponse.json(
        { success: false, message: `Only confirmed bookings can be checked in. Current status: ${booking.bookingStatus}` },
        { status: 400 }
      );
    }

    const indiaToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
    const bookingLastDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(booking.checkOutDate);
    if (!booking.isOpenEnded && indiaToday > bookingLastDay) {
      return NextResponse.json({ success: false, message: "This reservation has passed its checkout date. Update the stay dates before checking in." }, { status: 409 });
    }

    if (booking.balanceAmount > 0 && !settlePayment) {
      return NextResponse.json(
        { success: false, message: `Booking has a pending balance of ₹${booking.balanceAmount.toLocaleString()}. Please confirm payment collection at reception to proceed.` },
        { status: 400 }
      );
    }
    const allowedPaymentMethods = new Set(["cash", "upi", "card", "bank_transfer", "offline_prepaid"]);
    const normalizedPaymentMethod = typeof paymentMethod === "string" ? paymentMethod.toLowerCase() : "cash";
    if (settlePayment && booking.balanceAmount > 0 && !allowedPaymentMethods.has(normalizedPaymentMethod)) {
      return NextResponse.json({ success: false, message: "Choose a valid payment method." }, { status: 400 });
    }

    if (guestGovtIdVerified !== true) {
      return NextResponse.json(
        { success: false, message: "Government ID verification is required before check-in." },
        { status: 400 }
      );
    }

    if (!guestGovtId || !String(guestGovtId).trim()) {
      return NextResponse.json(
        { success: false, message: "Government ID number is required before check-in." },
        { status: 400 }
      );
    }

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const currentBooking = await tx.booking.findUnique({ where: { id: booking.id } });
      if (!currentBooking || currentBooking.bookingStatus !== "CONFIRMED") {
        throw Object.assign(new Error("This reservation is no longer available for check-in."), { status: 409 });
      }
      if (currentBooking.balanceAmount > 0 && !settlePayment) {
        throw Object.assign(new Error("The reservation still has a balance. Record it as paid before check-in."), { status: 409 });
      }
      const expectedBalancePaise = Math.max(0, Math.round((currentBooking.totalAmount - currentBooking.paidAmount) * 100));
      if (expectedBalancePaise !== Math.round(currentBooking.balanceAmount * 100)) {
        throw Object.assign(new Error("Reservation paid and due totals do not balance. Ask Finance to reconcile before check-in."), { status: 409 });
      }

      const conflictingStay = await tx.booking.findFirst({
        where: {
          id: { not: booking.id },
          bedId: booking.bedId,
          bookingStatus: { in: ["CONFIRMED", "CHECKED_IN", "PAYMENT_PENDING"] },
          AND: [{ checkInDate: { lt: booking.checkOutDate } }, { OR: [{ isOpenEnded: true }, { checkOutDate: { gt: booking.checkInDate } }] }],
        },
      });
      if (conflictingStay) throw Object.assign(new Error("The assigned bed conflicts with another active reservation. Resolve the bed assignment before check-in."), { status: 409 });
      const currentBed = await tx.bed.findUnique({ where: { id: booking.bedId } });
      if (!currentBed || ["OCCUPIED", "CLEANING", "MAINTENANCE", "BLOCKED"].includes(currentBed.status)) {
        throw Object.assign(new Error("The assigned bed is not ready for check-in."), { status: 409 });
      }

      const invoices = await tx.invoice.findMany({ where: { bookingId: booking.id, status: { not: "CANCELLED" } }, orderBy: { createdAt: "asc" } });
      if (invoices.length === 0) {
        await createInvoiceWithRetry(tx, {
          bookingId: booking.id,
          customerId: booking.customerId,
          hostelId: booking.hostelId,
          issueDate: now,
          dueDate: now,
          baseAmount: booking.baseAmount,
          taxAmount: booking.taxAmount,
          serviceFee: booking.serviceFee,
          securityDeposit: booking.securityDeposit,
          discountAmount: booking.discountAmount,
          totalAmount: booking.totalAmount,
          paidAmount: booking.paidAmount,
          balanceDue: booking.balanceAmount,
          status: booking.balanceAmount === 0 ? "PAID" : booking.paidAmount > 0 ? "PARTIAL" : "DUE",
        });
      }

      if (currentBooking.balanceAmount > 0) {
        const currentInvoices = await tx.invoice.findMany({ where: { bookingId: booking.id, status: { not: "CANCELLED" } }, orderBy: { createdAt: "asc" } });
        const ledgerDuePaise = currentInvoices.reduce((total, invoice) => total + Math.max(0, Math.round((invoice.totalAmount - invoice.paidAmount) * 100)), 0);
        const balancePaise = Math.round(currentBooking.balanceAmount * 100);
        if (ledgerDuePaise !== balancePaise) {
          throw Object.assign(new Error("Invoice balances do not match the reservation balance. Ask Finance to reconcile before check-in."), { status: 409 });
        }
        if (!settlePayment) throw Object.assign(new Error("Payment collection is required before check-in."), { status: 409 });

        let paymentRemainderPaise = balancePaise;
        for (const invoice of currentInvoices) {
          const invoiceDuePaise = Math.max(0, Math.round((invoice.totalAmount - invoice.paidAmount) * 100));
          const appliedPaise = Math.min(paymentRemainderPaise, invoiceDuePaise);
          if (appliedPaise === 0) continue;
          const paidPaise = Math.round(invoice.paidAmount * 100) + appliedPaise;
          const duePaise = Math.max(0, Math.round(invoice.totalAmount * 100) - paidPaise);
          await tx.invoice.update({ where: { id: invoice.id }, data: { paidAmount: paidPaise / 100, balanceDue: duePaise / 100, status: duePaise === 0 ? "PAID" : "PARTIAL" } });
          paymentRemainderPaise -= appliedPaise;
        }
        if (paymentRemainderPaise > 0) throw Object.assign(new Error("Could not apply the check-in payment to invoices."), { status: 409 });

        await tx.payment.create({
          data: {
            bookingId: booking.id,
            customerId: booking.customerId,
            amount: balancePaise / 100,
            currency: "INR",
            gateway: normalizedPaymentMethod.toUpperCase(),
            gatewayPaymentId: `reception_pay_${Date.now()}`,
            status: "CAPTURED",
            paymentMethod: normalizedPaymentMethod,
          },
        });
      }

      // 1. Update Booking
      const claimedBooking = await tx.booking.updateMany({
        where: { id: booking.id, bookingStatus: "CONFIRMED" },
        data: {
          bookingStatus: "CHECKED_IN",
          paymentStatus: "PAID",
          paidAmount: currentBooking.totalAmount,
          balanceAmount: 0,
          checkInTime: now,
          checkedInBy: user.name,
          guestGovtId: String(guestGovtId).trim(),
        },
      });
      if (claimedBooking.count !== 1) throw Object.assign(new Error("This reservation was checked in by another staff member."), { status: 409 });
      const b = await tx.booking.findUniqueOrThrow({
        where: { id: booking.id },
        include: { hostel: true, room: { include: { roomType: true } }, bed: true },
      });

      // 2. Mark Bed as OCCUPIED
      await tx.bed.update({
        where: { id: booking.bedId },
        data: {
          status: "OCCUPIED",
          currentOccupantId: booking.customerId,
        },
      });
      await tx.additionalCharge.updateMany({ where: { bookingId: booking.id, status: "PENDING" }, data: { status: "PAID" } });

      return b;
    });

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: "GUEST_CHECKED_IN",
      entity: "Booking",
      entityId: booking.id,
      newValue: {
        checkedInBy: user.name,
        time: now.toISOString(),
        bed: booking.bed.bedNumber,
        room: booking.room.roomNumber,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Guest ${booking.guestName} successfully checked into Room ${booking.room.roomNumber}, ${booking.bed.bedNumber}!`,
      data: updated,
    });
  } catch (error: any) {
    console.error("Check-in error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to process check-in" },
      { status: error.status || 500 }
    );
  }
}
