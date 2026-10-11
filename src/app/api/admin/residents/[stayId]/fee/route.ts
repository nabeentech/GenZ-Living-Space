import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import { nextBillingDate } from "@/lib/resident-stays";
import { logAuditAction } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: { stayId: string } }) {
  const staff = await getSessionUser();
  if (!staff || !hasPermission(staff.role, [ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER, ROLES.RECEPTIONIST, ROLES.FINANCE])) {
    return NextResponse.json({ success: false, message: "Staff access required" }, { status: 403 });
  }
  try {
    const { method = "CASH", note = "" } = await req.json().catch(() => ({}));
    const stay = await prisma.residentStay.findUnique({ where: { id: params.stayId } });
    if (!stay || stay.status !== "ACTIVE") return NextResponse.json({ success: false, message: "Active resident stay not found." }, { status: 404 });

    const periodStart = new Date(stay.nextDueAt);
    const periodEnd = nextBillingDate(stay.joinedAt, periodStart);
    const updated = await prisma.$transaction(async (tx) => {
      const receipt = await tx.feeReceipt.create({
        data: { stayId: stay.id, residentId: stay.residentId, hostelId: stay.hostelId, amount: stay.monthlyFee, periodStart, periodEnd, receivedBy: staff.name, method, note: String(note).trim() || null },
      });
      const activeStay = await tx.residentStay.updateMany({ where: { id: stay.id, status: "ACTIVE", nextDueAt: stay.nextDueAt }, data: { nextDueAt: periodEnd } });
      if (activeStay.count !== 1) throw new Error("STAY_CHANGED");
      return receipt;
    });
    await logAuditAction({ userId: staff.id, userName: staff.name, action: "RESIDENT_MONTHLY_FEE_RECORDED", entity: "FeeReceipt", entityId: updated.id, newValue: { stayId: stay.id, amount: stay.monthlyFee, method, periodStart, periodEnd } });
    return NextResponse.json({ success: true, message: "Fee recorded and next due date updated.", data: updated });
  } catch (error: any) {
    if (error?.message === "STAY_CHANGED") return NextResponse.json({ success: false, message: "The stay was updated elsewhere. Refresh and try again." }, { status: 409 });
    console.error("Fee recording error:", error);
    return NextResponse.json({ success: false, message: "Could not record this fee." }, { status: 500 });
  }
}
