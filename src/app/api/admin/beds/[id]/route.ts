import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

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
      include: { room: true, hostel: true, residentStays: { where: { status: "ACTIVE" }, select: { id: true } }, bookings: { where: { bookingStatus: { in: ["CONFIRMED", "CHECKED_IN"] } }, select: { bookingStatus: true } } },
    });

    if (!bed) {
      return NextResponse.json({ success: false, message: "Bed not found" }, { status: 404 });
    }

    const previousStatus = bed.status;
    const allowedStatuses = ["AVAILABLE", "OCCUPIED", "RESERVED", "MAINTENANCE", "CLEANING", "BLOCKED"];
    if (!allowedStatuses.includes(status)) return NextResponse.json({ success: false, message: "Invalid bed status." }, { status: 400 });
    if (bed.residentStays.length > 0 && status !== "OCCUPIED") {
      return NextResponse.json({ success: false, message: "This bed has an active resident allocation. Vacate the resident before changing its status." }, { status: 409 });
    }
    if (bed.currentOccupantId && status !== "OCCUPIED") {
      return NextResponse.json({ success: false, message: "This bed has a recorded occupant. Complete their stay before changing its status." }, { status: 409 });
    }
    if (bed.bookings.some((booking) => booking.bookingStatus === "CHECKED_IN") && status !== "OCCUPIED") {
      return NextResponse.json({ success: false, message: "This bed is assigned to a checked-in guest. Complete their stay first." }, { status: 409 });
    }
    if (bed.bookings.some((booking) => booking.bookingStatus === "CONFIRMED") && status !== "RESERVED") {
      return NextResponse.json({ success: false, message: "This bed is reserved for a confirmed booking." }, { status: 409 });
    }
    if (status === "OCCUPIED" && !bed.currentOccupantId && bed.residentStays.length === 0) {
      return NextResponse.json({ success: false, message: "Use resident registration to allocate an occupied bed." }, { status: 409 });
    }

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
