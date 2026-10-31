import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: taskId } = await params;
    const { status, notes } = await req.json();
    if (typeof status !== "string" || !["DIRTY", "CLEANING", "CLEAN", "INSPECTED"].includes(status)) {
      return NextResponse.json({ success: false, message: "Choose a valid housekeeping status." }, { status: 400 });
    }
    if (notes !== undefined && (typeof notes !== "string" || notes.length > 1000)) {
      return NextResponse.json({ success: false, message: "Housekeeping notes must be 1,000 characters or fewer." }, { status: 400 });
    }

    const task = await prisma.housekeepingTask.findUnique({
      where: { id: taskId },
      include: { bed: true },
    });

    if (!task) {
      return NextResponse.json({ success: false, message: "Task not found" }, { status: 404 });
    }

    const nextStatuses: Record<string, string> = { DIRTY: "CLEANING", CLEANING: "CLEAN", CLEAN: "INSPECTED" };
    if (nextStatuses[task.status] !== status) {
      return NextResponse.json({ success: false, message: `This task is ${task.status.toLowerCase()}; its next step is ${nextStatuses[task.status]?.toLowerCase() || "not available"}.` }, { status: 409 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const claimed = await tx.housekeepingTask.updateMany({
        where: { id: taskId, status: task.status },
        data: {
          status,
          notes: notes === undefined ? task.notes : notes.trim() || task.notes,
          completedAt: status === "INSPECTED" ? new Date() : null,
        },
      });
      if (claimed.count !== 1) throw Object.assign(new Error("This housekeeping task changed. Refresh the queue and retry."), { status: 409 });
      if (task.bedId && status === "INSPECTED") {
        const otherOpenTask = await tx.housekeepingTask.findFirst({
          where: { id: { not: taskId }, bedId: task.bedId, status: { notIn: ["CLEAN", "INSPECTED"] } },
        });
        if (otherOpenTask) return tx.housekeepingTask.findUniqueOrThrow({ where: { id: taskId } });
        const nextBooking = await tx.booking.findFirst({
          where: { bedId: task.bedId, bookingStatus: { in: ["CONFIRMED", "PAYMENT_PENDING"] }, checkOutDate: { gt: new Date() } },
          orderBy: { checkInDate: "asc" },
        });
        await tx.bed.updateMany({
          where: { id: task.bedId, status: "CLEANING" },
          data: { status: nextBooking ? "RESERVED" : "AVAILABLE", currentOccupantId: nextBooking?.customerId || null },
        });
      }
      return tx.housekeepingTask.findUniqueOrThrow({ where: { id: taskId } });
    });

    return NextResponse.json({
      success: true,
      message: `Housekeeping task updated to ${status}`,
      data: updated,
    });
  } catch (error: any) {
    console.error("Housekeeping task update error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update task" },
      { status: error.status || 500 }
    );
  }
}
