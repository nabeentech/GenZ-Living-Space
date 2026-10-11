import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

export async function POST(_req: Request, { params }: { params: { stayId: string } }) {
  const staff = await getSessionUser();
  if (!staff || !hasPermission(staff.role, [ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER, ROLES.RECEPTIONIST])) {
    return NextResponse.json({ success: false, message: "Staff access required" }, { status: 403 });
  }
  const stay = await prisma.residentStay.findUnique({ where: { id: params.stayId }, include: { resident: true, room: true, bed: true } });
  if (!stay || stay.status !== "ACTIVE") return NextResponse.json({ success: false, message: "Active resident stay not found." }, { status: 404 });

  try {
    await prisma.$transaction(async (tx) => {
      const result = await tx.residentStay.updateMany({ where: { id: stay.id, status: "ACTIVE" }, data: { status: "VACATED", vacatedAt: new Date() } });
      if (result.count !== 1) throw new Error("STAY_CHANGED");
      await tx.bed.updateMany({ where: { id: stay.bedId, currentOccupantId: stay.residentId }, data: { currentOccupantId: null, status: "AVAILABLE" } });
    });
    await logAuditAction({ userId: staff.id, userName: staff.name, action: "RESIDENT_VACATED", entity: "ResidentStay", entityId: stay.id, previousValue: { status: "ACTIVE", bed: stay.bed.bedNumber }, newValue: { status: "VACATED", resident: stay.resident.name } });
    return NextResponse.json({ success: true, message: "Resident vacated and the bed is available.", data: { stayId: stay.id } });
  } catch (error: any) {
    if (error?.message === "STAY_CHANGED") return NextResponse.json({ success: false, message: "The stay was updated elsewhere. Refresh and try again." }, { status: 409 });
    console.error("Vacate error:", error);
    return NextResponse.json({ success: false, message: "Could not vacate this resident." }, { status: 500 });
  }
}
