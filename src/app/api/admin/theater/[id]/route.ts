import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { canAccessModule, canUserDelete, canUserEdit } from "@/lib/permissions";
import { logAuditAction } from "@/lib/audit";

const VALID_ADMIN_THEATER_STATUSES = new Set(["BOOKED", "COMPLETED", "BLOCKED", "CANCELLED"]);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canAccessModule(user, "theater") || !canUserEdit(user)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.homeTheaterBooking.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Theater booking not found" }, { status: 404 });
    }

    const body = await req.json();
    const data: any = {};

    if (body.status !== undefined) {
      const nextStatus =
        typeof body.status === "string" ? body.status.trim().toUpperCase() : "";
      if (!VALID_ADMIN_THEATER_STATUSES.has(nextStatus)) {
        return NextResponse.json({ error: "Invalid status value." }, { status: 400 });
      }
      data.status = nextStatus;
    }

    if (body.title !== undefined) {
      data.title =
        typeof body.title === "string" && body.title.trim()
          ? body.title.trim().slice(0, 80)
          : existing.title;
    }

    if (body.guestCount !== undefined) {
      const gc = Number(body.guestCount);
      if (!Number.isFinite(gc) || gc < 1 || gc > 20) {
        return NextResponse.json(
          { error: "Guest count must be between 1 and 20." },
          { status: 400 }
        );
      }
      data.guestCount = Math.round(gc);
    }

    if (body.notes !== undefined) {
      data.notes =
        typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;
    }

    const booking = await prisma.homeTheaterBooking.update({
      where: { id },
      data,
    });

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: "UPDATE",
      entity: "HOME_THEATER",
      entityId: booking.id,
      previousValue: { status: existing.status, title: existing.title },
      newValue: { status: booking.status, title: booking.title },
    });

    return NextResponse.json({ booking });
  } catch (error) {
    console.error("Failed to update home theater booking:", error);
    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canAccessModule(user, "theater") || !canUserDelete(user)) {
      return NextResponse.json({ error: "Delete permission denied" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.homeTheaterBooking.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    await prisma.homeTheaterBooking.delete({ where: { id } });

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: "DELETE",
      entity: "HOME_THEATER",
      entityId: id,
      previousValue: {
        bookingCode: existing.bookingCode,
        residentName: existing.residentName,
        slotDateKey: existing.slotDateKey,
        slotKey: existing.slotKey,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete home theater booking:", error);
    return NextResponse.json(
      { error: "Failed to delete booking" },
      { status: 500 }
    );
  }
}
