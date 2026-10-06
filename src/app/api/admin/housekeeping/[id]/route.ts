import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (
      !user ||
      !hasPermission(user.role, [
        ROLES.SUPER_ADMIN,
        ROLES.PROPERTY_MANAGER,
        ROLES.HOUSEKEEPING,
      ])
    ) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const taskId = params.id;
    const { status, notes } = await req.json();

    const task = await prisma.housekeepingTask.findUnique({
      where: { id: taskId },
      include: { bed: true },
    });

    if (!task) {
      return NextResponse.json({ success: false, message: "Task not found" }, { status: 404 });
    }

    const updated = await prisma.housekeepingTask.update({
      where: { id: taskId },
      data: {
        status,
        notes: notes || task.notes,
        completedAt: status === "CLEAN" || status === "INSPECTED" ? new Date() : null,
      },
    });

    // Only mark bed as AVAILABLE if it's currently in CLEANING status
    // This prevents overwriting OCCUPIED or other statuses
    if (task.bedId && (status === "CLEAN" || status === "INSPECTED")) {
      const currentBed = await prisma.bed.findUnique({
        where: { id: task.bedId },
      });

      if (currentBed?.status === "CLEANING") {
        await prisma.bed.update({
          where: { id: task.bedId },
          data: { status: "AVAILABLE" },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Housekeeping task updated to ${status}`,
      data: updated,
    });
  } catch (error: any) {
    console.error("Housekeeping task update error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update task" },
      { status: 500 }
    );
  }
}
