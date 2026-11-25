import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { canAccessModule, canUserEdit } from "@/lib/permissions";
import { logAuditAction } from "@/lib/audit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (
      !user ||
      !canUserEdit(user) ||
      (!canAccessModule(user, "customers") &&
        !canAccessModule(user, "payments") &&
        !canAccessModule(user, "bookings"))
    ) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const { id: bookingId } = await params;
    const body = await req.json().catch(() => ({}));
    const nextDueDate = typeof body.nextDueDate === "string" ? body.nextDueDate.trim() : "";

    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDueDate)) {
      return NextResponse.json(
        { success: false, message: "Enter a valid payment cycle date (YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    const parsedDate = new Date(`${nextDueDate}T00:00:00.000Z`);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== nextDueDate) {
      return NextResponse.json(
        { success: false, message: "Invalid calendar date selected." },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        invoices: {
          where: { status: { in: ["DUE", "PARTIAL"] } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
    }
    if (booking.stayType !== "MONTHLY") {
      return NextResponse.json(
        { success: false, message: "Payment cycle can only be changed for monthly residents." },
        { status: 400 }
      );
    }
    if (!["CONFIRMED", "CHECKED_IN"].includes(booking.bookingStatus)) {
      return NextResponse.json(
        { success: false, message: "Only active monthly residents can have their payment cycle updated." },
        { status: 400 }
      );
    }

    const oldDueDay = booking.checkOutDate.toISOString().slice(0, 10);

    const updated = await prisma.$transaction(async (tx) => {
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          checkOutDate: parsedDate,
        },
      });

      // If an open cycle invoice was issued for the previous cycle due date, move its due date too
      const matchingInvoice = booking.invoices.find(
        (inv) => new Date(inv.dueDate).toISOString().slice(0, 10) === oldDueDay
      );
      if (matchingInvoice) {
        await tx.invoice.update({
          where: { id: matchingInvoice.id },
          data: { dueDate: parsedDate },
        });
      }

      return updatedBooking;
    });

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: "UPDATE",
      entity: "BOOKING",
      entityId: bookingId,
      previousValue: { checkOutDate: oldDueDay },
      newValue: { checkOutDate: nextDueDate },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Update payment cycle error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update payment cycle" },
      { status: 500 }
    );
  }
}
