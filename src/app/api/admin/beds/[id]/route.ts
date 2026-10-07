import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

// jhbwfwegfbeigbeigbb
// hjewvbfuheb



export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, [ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER, ROLES.RECEPTIONIST, ROLES.HOUSEKEEPING])) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const bedId = params.id;
    const { status, note } = await req.json();

    const bed = await prisma.bed.findUnique({
      where: { id: bedId },
      include: { room: true, hostel: true },
    });

    if (!bed) {
      return NextResponse.json({ success: false, message: "Bed not found" }, { status: 404 });
    }

    const previousStatus = bed.status;

    const updated = await prisma.bed.update({
      where: { id: bedId },
      data: { status },
    });

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: "BED_STATUS_CHANGED",
      entity: "Bed",
      entityId: bed.id,
      previousValue: { status: previousStatus },
      newValue: { status, note },
    });

    return NextResponse.json({
      success: true,
      message: `Bed ${bed.bedNumber} status changed from ${previousStatus} to ${status}`,
      data: updated,
    });
  } catch (error: any) {
    console.error("Bed update error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update bed" },
      { status: 500 }
    );
  }
}
