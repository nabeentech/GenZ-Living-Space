import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import { canUserEdit } from "@/lib/permissions";
import { logAuditAction } from "@/lib/audit";
import { createRefund } from "@/lib/phonepe";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (
      !user ||
      !hasPermission(user.role, [ROLES.SUPER_ADMIN, ROLES.FINANCE])
    ) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    if (!canUserEdit(user)) {
      return NextResponse.json({ success: false, message: "You do not have permission to process refunds" }, { status: 403 });
    }

    const { id: refundId } = await params;
    const { action = "APPROVE" } = await req.json();
    if (!["APPROVE", "REJECT", "MARK_PROCESSED"].includes(action)) {
      return NextResponse.json({ success: false, message: "Choose approve, reject, or mark as refunded." }, { status: 400 });
    }

    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: { booking: { include: { payments: true } }, payment: true },
    });

    if (!refund) {
      return NextResponse.json({ success: false, message: "Refund request not found" }, { status: 404 });
    }

    if (!refund.payment || !["CAPTURED", "COMPLETED", "PARTIALLY_REFUNDED"].includes(refund.payment.status)) {
      return NextResponse.json({ success: false, message: "Refund request is not linked to a captured payment." }, { status: 409 });
    }

    if (action === "APPROVE" && refund.status !== "REQUESTED") {
      return NextResponse.json({ success: false, message: "This refund request has already been reviewed." }, { status: 409 });
    }
    if (action === "REJECT" && refund.status !== "REQUESTED") {
      return NextResponse.json({ success: false, message: "Only requested refunds can be rejected." }, { status: 409 });
    }
    if (action === "MARK_PROCESSED" && refund.status !== "APPROVED") {
      return NextResponse.json({ success: false, message: "Approve this refund before recording the external refund as sent." }, { status: 409 });
    }

    let providerRefundResult: { refundId: string; state: string; amount: number } | null = null;
    if (action === "APPROVE" && refund.payment.gateway === "PHONEPE" && refund.payment.gatewayOrderId) {
      try {
        providerRefundResult = await createRefund({
          merchantRefundId: `GZLS_REF_${refund.id.slice(-10)}`,
          originalMerchantOrderId: refund.payment.gatewayOrderId,
          amount: Math.round(refund.amount * 100),
        });
      } catch (phonePeErr: any) {
        console.error("PhonePe refund initiation error:", phonePeErr);
        return NextResponse.json({ success: false, message: `PhonePe refund failed: ${phonePeErr.message}` }, { status: 502 });
      }
      if (providerRefundResult && providerRefundResult.amount !== Math.round(refund.amount * 100)) {
        return NextResponse.json({ success: false, message: "PhonePe refund amount did not match this request. Finance review is required." }, { status: 502 });
      }
    }

    const shouldMarkProcessed = action === "MARK_PROCESSED" || providerRefundResult?.state === "COMPLETED";
    const newStatus = action === "REJECT" ? "REJECTED" : shouldMarkProcessed ? "PROCESSED" : "APPROVED";

    const updated = await prisma.$transaction(async (tx) => {
      const currentRefund = await tx.refund.findUnique({ where: { id: refundId }, include: { payment: true, booking: true } });
      if (!currentRefund || currentRefund.status !== refund.status) throw Object.assign(new Error("Refund status changed. Refresh the page and review it again."), { status: 409 });
      if (newStatus === "PROCESSED" && !currentRefund.payment) throw Object.assign(new Error("Refund is no longer linked to a payment."), { status: 409 });
      const paymentToRefund = currentRefund.payment;
      const claimedRefund = await tx.refund.updateMany({
        where: { id: refundId, status: currentRefund.status },
        data: {
          status: newStatus,
          processedBy: user.name,
          processedAt: newStatus === "PROCESSED" || newStatus === "REJECTED" ? new Date() : null,
          notes: providerRefundResult ? JSON.stringify({ provider: "PHONEPE", refundId: providerRefundResult.refundId, state: providerRefundResult.state }) : currentRefund.notes,
        },
      });
      if (claimedRefund.count !== 1) throw Object.assign(new Error("Refund status changed. Refresh the page and review it again."), { status: 409 });
      const ref = await tx.refund.findUniqueOrThrow({ where: { id: refundId } });

      if (newStatus === "PROCESSED" && currentRefund.booking) {
        const booking = await tx.booking.findUniqueOrThrow({ where: { id: currentRefund.booking.id } });
        if (refund.amount > booking.paidAmount) throw Object.assign(new Error("Refund exceeds the amount currently recorded as paid."), { status: 409 });
        const claimedBooking = await tx.booking.updateMany({ where: { id: booking.id, paidAmount: { gte: refund.amount } }, data: { paidAmount: { decrement: refund.amount } } });
        if (claimedBooking.count !== 1) throw Object.assign(new Error("Another refund changed this reservation balance. Refresh and reconcile before retrying."), { status: 409 });
        const afterRefund = await tx.booking.findUniqueOrThrow({ where: { id: booking.id } });
        const remainingPaid = Math.max(0, Math.round(afterRefund.paidAmount * 100) / 100);
        await tx.booking.update({ where: { id: booking.id }, data: {
          paymentStatus: remainingPaid === 0 ? "REFUNDED" : "PARTIAL",
          balanceAmount: afterRefund.bookingStatus === "CANCELLED" ? 0 : Math.max(0, afterRefund.totalAmount - remainingPaid),
        } });
        const refundedOnPayment = await tx.refund.aggregate({ where: { paymentId: currentRefund.paymentId, status: "PROCESSED" }, _sum: { amount: true } });
        const totalRefunded = refundedOnPayment._sum.amount || 0;
        if (totalRefunded >= paymentToRefund!.amount) {
          await tx.payment.update({ where: { id: currentRefund.paymentId! }, data: { status: "REFUNDED" } });
        } else {
          await tx.payment.update({ where: { id: currentRefund.paymentId! }, data: { status: "PARTIALLY_REFUNDED" } });
        }
      }

      return ref;
    }, { isolationLevel: "Serializable" });

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: newStatus === "PROCESSED" ? "REFUND_PROCESSED" : newStatus === "APPROVED" ? "REFUND_APPROVED" : "REFUND_REJECTED",
      entity: "Refund",
      entityId: refund.id,
      newValue: { status: newStatus, amount: refund.amount },
    });

    return NextResponse.json({
      success: true,
      message: newStatus === "APPROVED" ? `Refund of ₹${refund.amount.toLocaleString()} approved. Mark it refunded after the money is actually returned.` : `Refund of ₹${refund.amount.toLocaleString()} marked ${newStatus}.`,
      data: updated,
    });
  } catch (error: any) {
    console.error("Refund approval error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to process refund" },
      { status: error.status || 500 }
    );
  }
}
