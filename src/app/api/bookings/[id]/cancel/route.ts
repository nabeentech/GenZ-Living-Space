import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";
import { isLongStay } from "@/lib/booking-policy";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    if (user.role !== ROLES.CUSTOMER && !hasPermission(user.role, [ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER, ROLES.RECEPTIONIST, ROLES.FINANCE])) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const { id: bookingId } = await params;
    const { reason = "Customer requested cancellation" } = await req.json();
    if (typeof reason !== "string" || reason.length > 300) {
      return NextResponse.json({ success: false, message: "Cancellation reason must be 300 characters or fewer." }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { hostel: true, room: true, bed: true, payments: true },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 }
      );
    }

    // Verify ownership if customer
    if (user.role === "CUSTOMER" && booking.customerId !== user.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized to cancel this booking" },
        { status: 403 }
      );
    }

    if (user.role === "CUSTOMER" && booking.isOpenEnded && booking.checkInDate <= new Date()) {
      return NextResponse.json({ success: false, message: "Month-to-month stays require a vacating notice. Submit it from your dashboard." }, { status: 403 });
    }

    if (
      user.role === "CUSTOMER" && !booking.isOpenEnded &&
      isLongStay(new Date(booking.checkInDate), new Date(booking.checkOutDate))
    ) {
      return NextResponse.json(
        { success: false, message: "Bookings of 28 nights or more require one month notice and can only be cancelled by an administrator." },
        { status: 403 }
      );
    }

    if (["CANCELLED", "CHECKED_OUT", "REFUNDED", "NO_SHOW"].includes(booking.bookingStatus)) {
      return NextResponse.json(
        { success: false, message: "This booking can no longer be cancelled" },
        { status: 400 }
      );
    }
    if (booking.bookingStatus === "CHECKED_IN") {
      return NextResponse.json({ success: false, message: "A checked-in guest must be checked out from the reception desk; cancelling would incorrectly release their bed." }, { status: 409 });
    }
    if (!["CONFIRMED", "PAYMENT_PENDING"].includes(booking.bookingStatus)) {
      return NextResponse.json({ success: false, message: "This reservation is not in a cancellable state." }, { status: 409 });
    }

    // Cancellation Policy calculation:
    // > 7 days: 100% refund
    // 3 - 7 days: 50% refund
    // < 3 days: 0% refund
    const now = new Date();
    const checkIn = new Date(booking.checkInDate);
    const diffDays = (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    let refundPct = 0;
    if (diffDays >= 7) {
      refundPct = 1.0;
    } else if (diffDays >= 3) {
      refundPct = 0.5;
    } else {
      refundPct = 0.0;
    }

    // Atomic cancellation & bed inventory release
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.booking.findUnique({ where: { id: booking.id }, include: { payments: { orderBy: { createdAt: "desc" }, include: { refunds: true } } } });
      if (!current || !["CONFIRMED", "PAYMENT_PENDING"].includes(current.bookingStatus)) {
        throw Object.assign(new Error("This reservation is no longer cancellable."), { status: 409 });
      }
      if (current.payments.some(payment => ["PENDING", "CREATED", "AUTHORIZED", "REVIEW_REQUIRED"].includes(payment.status))) {
        throw Object.assign(new Error("A payment is still being verified. Wait for its result before cancelling so the bed is not released while payment is uncertain."), { status: 409 });
      }

      const capturedPayments = current.payments.filter(payment => ["CAPTURED", "COMPLETED", "PARTIALLY_REFUNDED"].includes(payment.status));
      const availableForRefund = capturedPayments.reduce((total, payment) => {
        const priorRefunds = payment.refunds.filter(refund => refund.status !== "REJECTED").reduce((sum, refund) => sum + refund.amount, 0);
        return total + Math.max(0, payment.amount - priorRefunds);
      }, 0);
      let refundRemainder = Math.min(Math.round(current.paidAmount * 100 * refundPct), Math.round(availableForRefund * 100));
      if (current.paidAmount > 0 && refundPct > 0 && refundRemainder === 0) {
        throw Object.assign(new Error("No captured payment is available to refund. Ask Finance to reconcile this booking."), { status: 409 });
      }
      const refundRecords = [];
      for (const payment of capturedPayments) {
        if (refundRemainder <= 0) break;
        const previouslyRequested = payment.refunds.filter(refund => refund.status !== "REJECTED").reduce((sum, refund) => sum + refund.amount, 0);
        const availableOnPayment = Math.max(0, Math.round((payment.amount - previouslyRequested) * 100));
        const refundPaise = Math.min(refundRemainder, availableOnPayment);
        if (refundPaise <= 0) continue;
        refundRecords.push(await tx.refund.create({
          data: {
            bookingId: current.id,
            paymentId: payment.id,
            amount: refundPaise / 100,
            reason: `${reason} (${Math.round(refundPct * 100)}% policy refund)`,
            status: "REQUESTED",
          },
        }));
        refundRemainder -= refundPaise;
      }

      const requestedRefund = refundRecords.reduce((sum, refund) => sum + refund.amount, 0);
      const cancellation = await tx.booking.updateMany({
        where: { id: current.id, bookingStatus: current.bookingStatus },
        data: { bookingStatus: "CANCELLED" },
      });
      if (cancellation.count !== 1) throw Object.assign(new Error("Reservation status changed. Refresh and retry."), { status: 409 });
      const updatedBooking = await tx.booking.findUniqueOrThrow({ where: { id: current.id } });
      await tx.invoice.updateMany({ where: { bookingId: current.id, status: { not: "CANCELLED" } }, data: { status: "CANCELLED", balanceDue: 0 } });

      // Preserve any other active reservation or resident on this bed.
      const nextOccupancy = await tx.booking.findFirst({
        where: {
          id: { not: current.id },
          bedId: current.bedId,
          bookingStatus: "CHECKED_IN",
          AND: [{ checkInDate: { lt: current.checkOutDate } }, { OR: [{ isOpenEnded: true }, { checkOutDate: { gt: current.checkInDate } }] }],
        },
      }) || await tx.booking.findFirst({
        where: {
          id: { not: current.id },
          bedId: current.bedId,
          bookingStatus: { in: ["CONFIRMED", "PAYMENT_PENDING"] },
          AND: [{ checkInDate: { lt: current.checkOutDate } }, { OR: [{ isOpenEnded: true }, { checkOutDate: { gt: current.checkInDate } }] }],
        },
        orderBy: { checkInDate: "asc" },
      });
      await tx.bed.update({
        where: { id: current.bedId },
        data: {
          status: nextOccupancy?.bookingStatus === "CHECKED_IN" ? "OCCUPIED" : nextOccupancy ? "RESERVED" : "AVAILABLE",
          currentOccupantId: nextOccupancy?.bookingStatus === "CHECKED_IN" ? nextOccupancy.customerId : nextOccupancy ? nextOccupancy.customerId : null,
        },
      });

      return { updatedBooking, refundRecords, requestedRefund };
    });

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: "BOOKING_CANCELLED",
      entity: "Booking",
      entityId: booking.id,
      newValue: {
        refundAmount: result.requestedRefund,
        refundPercentage: Math.round(refundPct * 100),
        reason,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Booking cancelled successfully. Refund amount of ₹${result.requestedRefund.toLocaleString()} (${Math.round(
        refundPct * 100
      )}%) has been queued.`,
      data: result,
    });
  } catch (error: any) {
    console.error("Cancellation error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to cancel booking" },
      { status: error.status || 500 }
    );
  }
}
