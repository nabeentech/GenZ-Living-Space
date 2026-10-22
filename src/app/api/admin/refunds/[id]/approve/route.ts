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
    const { action = "APPROVE" } = await req.json(); // "APPROVE" or "REJECT"

    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: { booking: { include: { payments: true } } },
    });

    if (!refund) {
      return NextResponse.json({ success: false, message: "Refund request not found" }, { status: 404 });
    }

    let phonePeRefundResult: any = null;
    if (action === "APPROVE" && refund.booking?.payments?.length) {
      const phonePePayment = refund.booking.payments.find(
        (p) => p.gateway === "PHONEPE" && p.gatewayOrderId && p.status === "COMPLETED"
      );

      if (phonePePayment?.gatewayOrderId) {
        try {
          const refundPaise = Math.round(refund.amount * 100);
          phonePeRefundResult = await createRefund({
            merchantRefundId: `GZLS_REF_${refund.id.slice(-10)}_${Date.now().toString(36)}`,
            originalMerchantOrderId: phonePePayment.gatewayOrderId,
            amount: refundPaise,
          });
        } catch (phonePeErr: any) {
          console.error("PhonePe refund initiation error:", phonePeErr);
          return NextResponse.json(
            { success: false, message: `PhonePe refund failed: ${phonePeErr.message}` },
            { status: 502 }
          );
        }
      }
    }

    const newStatus = action === "APPROVE" ? "PROCESSED" : "REJECTED";

    const updated = await prisma.$transaction(async (tx) => {
      const ref = await tx.refund.update({
        where: { id: refundId },
        data: {
          status: newStatus,
          processedBy: user.name,
          processedAt: new Date(),
        },
      });

      if (action === "APPROVE" && refund.booking) {
        const remainingPaid = Math.max(0, refund.booking.paidAmount - refund.amount);
        await tx.booking.update({
          where: { id: refund.booking.id },
          data: {
            paymentStatus: remainingPaid === 0 ? "REFUNDED" : "PARTIAL",
            paidAmount: remainingPaid,
            balanceAmount: refund.booking.totalAmount - remainingPaid,
          },
        });
      }

      return ref;
    });

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: action === "APPROVE" ? "REFUND_APPROVED_AND_PROCESSED" : "REFUND_REJECTED",
      entity: "Refund",
      entityId: refund.id,
      newValue: { status: newStatus, amount: refund.amount },
    });

    return NextResponse.json({
      success: true,
      message: `Refund of ₹${refund.amount.toLocaleString()} has been marked as ${newStatus}`,
      data: updated,
    });
  } catch (error: any) {
    console.error("Refund approval error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to process refund" },
      { status: 500 }
    );
  }
}
