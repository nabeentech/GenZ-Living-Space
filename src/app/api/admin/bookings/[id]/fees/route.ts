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

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        invoices: {
          where: { status: { not: "CANCELLED" } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
    }

    const newPaidDep = body.paidSecurityDeposit !== undefined
      ? Number(body.paidSecurityDeposit)
      : booking.paidSecurityDeposit;
    const newPaidMaint = body.paidMaintenanceFee !== undefined
      ? Number(body.paidMaintenanceFee)
      : booking.paidMaintenanceFee;
    const syncBalance = body.syncBalance !== false;

    if (!Number.isFinite(newPaidDep) || newPaidDep < 0 || newPaidDep > booking.securityDeposit) {
      return NextResponse.json(
        { success: false, message: `Paid deposit must be between ₹0 and ₹${booking.securityDeposit.toLocaleString("en-IN")}.` },
        { status: 400 }
      );
    }

    if (!Number.isFinite(newPaidMaint) || newPaidMaint < 0 || newPaidMaint > booking.serviceFee) {
      return NextResponse.json(
        { success: false, message: `Paid maintenance fee must be between ₹0 and ₹${booking.serviceFee.toLocaleString("en-IN")}.` },
        { status: 400 }
      );
    }

    const oldUnpaidDep = Math.max(0, booking.securityDeposit - booking.paidSecurityDeposit);
    const newUnpaidDep = Math.max(0, booking.securityDeposit - newPaidDep);
    const oldUnpaidMaint = Math.max(0, booking.serviceFee - booking.paidMaintenanceFee);
    const newUnpaidMaint = Math.max(0, booking.serviceFee - newPaidMaint);

    const deltaUnpaid = (newUnpaidDep - oldUnpaidDep) + (newUnpaidMaint - oldUnpaidMaint);

    const updated = await prisma.$transaction(async (tx) => {
      let nextBalance = booking.balanceAmount;
      let nextPaid = booking.paidAmount;

      if (syncBalance && deltaUnpaid !== 0) {
        nextBalance = Math.max(0, Math.min(booking.totalAmount, booking.balanceAmount + deltaUnpaid));
        nextPaid = Math.max(0, booking.totalAmount - nextBalance);

        // Sync first/initial invoice balance so invoice ledger invariant remains intact
        const targetInvoice = booking.invoices[0];
        if (targetInvoice) {
          const invNewBal = Math.max(0, Math.min(targetInvoice.totalAmount, targetInvoice.balanceDue + deltaUnpaid));
          const invNewPaid = Math.max(0, targetInvoice.totalAmount - invNewBal);
          await tx.invoice.update({
            where: { id: targetInvoice.id },
            data: {
              paidAmount: invNewPaid,
              balanceDue: invNewBal,
              status: invNewBal === 0 ? "PAID" : invNewPaid > 0 ? "PARTIAL" : "DUE",
              paidSecurityDeposit: Math.min(targetInvoice.securityDeposit, newPaidDep),
            },
          });
        }
      } else if (booking.invoices[0]) {
        await tx.invoice.update({
          where: { id: booking.invoices[0].id },
          data: {
            paidSecurityDeposit: Math.min(booking.invoices[0].securityDeposit, newPaidDep),
          },
        });
      }

      return tx.booking.update({
        where: { id: bookingId },
        data: {
          paidSecurityDeposit: newPaidDep,
          paidMaintenanceFee: newPaidMaint,
          balanceAmount: nextBalance,
          paidAmount: nextPaid,
          paymentStatus: nextBalance === 0 ? "PAID" : nextPaid > 0 ? "PARTIAL" : "PENDING",
        },
      });
    });

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: "UPDATE",
      entity: "BOOKING",
      entityId: bookingId,
      previousValue: {
        paidSecurityDeposit: booking.paidSecurityDeposit,
        paidMaintenanceFee: booking.paidMaintenanceFee,
        balanceAmount: booking.balanceAmount,
      },
      newValue: {
        paidSecurityDeposit: newPaidDep,
        paidMaintenanceFee: newPaidMaint,
        balanceAmount: updated.balanceAmount,
        syncBalance,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Update booking fees error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update deposit/maintenance status" },
      { status: 500 }
    );
  }
}
