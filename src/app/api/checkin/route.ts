import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

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

    if (booking.paymentStatus !== "PAID" && !settlePayment) {
      return NextResponse.json(
        { success: false, message: `Booking has a pending balance of ₹${(booking.balanceAmount || booking.totalAmount).toLocaleString()}. Please confirm payment collection at reception to proceed.` },
        { status: 400 }
      );
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
      // If payment was pending and settled at reception, record it
      if (booking.paymentStatus !== "PAID" && settlePayment) {
        const settledAmount = booking.balanceAmount > 0 ? booking.balanceAmount : booking.totalAmount;
        const methodToUse = paymentMethod || "CASH";

        await tx.payment.create({
          data: {
            bookingId: booking.id,
            customerId: booking.customerId,
            amount: settledAmount,
            currency: "INR",
            gateway: String(methodToUse).toUpperCase(),
            gatewayPaymentId: `reception_pay_${Date.now()}`,
            status: "CAPTURED",
            paymentMethod: methodToUse,
          },
        });

        const inv = await tx.invoice.findFirst({ where: { bookingId: booking.id } });
        if (inv) {
          await tx.invoice.update({
            where: { id: inv.id },
            data: {
              status: "PAID",
              paidAmount: booking.totalAmount,
              balanceDue: 0,
            },
          });
        }
      }

      // 1. Update Booking
      const b = await tx.booking.update({
        where: { id: booking.id },
        data: {
          bookingStatus: "CHECKED_IN",
          paymentStatus: "PAID",
          paidAmount: booking.totalAmount,
          balanceAmount: 0,
          checkInTime: now,
          checkedInBy: user.name,
          guestGovtId: String(guestGovtId).trim(),
        },
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
      { status: 500 }
    );
  }
}
