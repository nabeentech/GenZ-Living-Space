import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (
      !user ||
      !hasPermission(user.role, [ROLES.SUPER_ADMIN, ROLES.FINANCE])
    ) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const refundId = params.id;
    const { action = "APPROVE" } = await req.json(); // "APPROVE" or "REJECT"

    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: { booking: true },
    });

    if (!refund) {
      return NextResponse.json({ success: false, message: "Refund request not found" }, { status: 404 });
    }

    const newStatus = action === "APPROVE" ? "PROCESSED" : "REJECTED";

    const updated = await prisma.refund.update({
      where: { id: refundId },
      data: {
        status: newStatus,
        processedBy: user.name,
        processedAt: new Date(),
      },
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
