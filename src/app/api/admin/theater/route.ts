import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { canAccessModule, canUserEdit } from "@/lib/permissions";
import { logAuditAction } from "@/lib/audit";
import {
  ACTIVE_THEATER_STATUSES,
  VALID_THEATER_SLOT_KEYS,
  generateTheaterBookingCode,
  getIndiaNowDateKey,
} from "@/lib/home-theater";

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canAccessModule(user, "theater")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    const bookings = await prisma.homeTheaterBooking.findMany({
      where: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? { slotDateKey: date } : undefined,
      orderBy: [{ slotDateKey: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("Failed to fetch admin home theater bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch Home Theater bookings" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canAccessModule(user, "theater") || !canUserEdit(user)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const body = await req.json();
    const action = body.action === "BLOCK" ? "BLOCK" : "BOOK";
    const slotDateKey = typeof body.slotDateKey === "string" ? body.slotDateKey.trim() : "";
    const slotKey = typeof body.slotKey === "string" ? body.slotKey.trim().toUpperCase() : "";
    const guestCountRaw = Number(body.guestCount ?? 2);
    const guestCount = Number.isFinite(guestCountRaw) ? Math.round(guestCountRaw) : 2;
    const notes =
      typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(slotDateKey)) {
      return NextResponse.json({ error: "Please select a valid date." }, { status: 400 });
    }
    if (!VALID_THEATER_SLOT_KEYS.has(slotKey)) {
      return NextResponse.json({ error: "Please select a valid time slot." }, { status: 400 });
    }

    const todayKey = getIndiaNowDateKey();
    if (slotDateKey < todayKey) {
      return NextResponse.json(
        { error: "Cannot schedule or block a slot in the past." },
        { status: 400 }
      );
    }

    let userId: string | null = null;
    let bookingId: string | null = null;
    let residentName = "";
    let residentPhone: string | null = null;
    let roomBedLabel: string | null = null;
    let title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim().slice(0, 80)
        : action === "BLOCK"
        ? "Maintenance / Management Screening"
        : "Movie / Screening";

    if (action === "BLOCK") {
      residentName = "Management Block";
    } else {
      if (guestCount < 1 || guestCount > 20) {
        return NextResponse.json(
          { error: "Guest count must be between 1 and 20." },
          { status: 400 }
        );
      }

      const residentBookingId =
        typeof body.residentBookingId === "string" && body.residentBookingId.trim()
          ? body.residentBookingId.trim()
          : null;

      if (residentBookingId) {
        const stay = await prisma.booking.findUnique({
          where: { id: residentBookingId },
          select: {
            id: true,
            customerId: true,
            guestName: true,
            guestPhone: true,
            bookingStatus: true,
            room: { select: { roomNumber: true } },
            bed: { select: { bedNumber: true } },
          },
        });
        if (!stay || !["CONFIRMED", "CHECKED_IN"].includes(stay.bookingStatus)) {
          return NextResponse.json(
            { error: "Selected resident does not have an active stay." },
            { status: 400 }
          );
        }
        userId = stay.customerId;
        bookingId = stay.id;
        residentName = stay.guestName;
        residentPhone = stay.guestPhone;
        roomBedLabel = `Room ${stay.room.roomNumber} · Bed ${stay.bed.bedNumber}`;
      } else {
        residentName =
          typeof body.residentName === "string" ? body.residentName.trim() : "";
        residentPhone =
          typeof body.residentPhone === "string" && body.residentPhone.trim()
            ? body.residentPhone.trim()
            : null;
        roomBedLabel =
          typeof body.roomBedLabel === "string" && body.roomBedLabel.trim()
            ? body.roomBedLabel.trim()
            : null;
        if (residentName.length < 2) {
          return NextResponse.json(
            { error: "Select an active resident or enter a resident name." },
            { status: 400 }
          );
        }
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.homeTheaterBooking.findFirst({
        where: {
          slotDateKey,
          slotKey,
          status: { in: ACTIVE_THEATER_STATUSES },
        },
        select: { id: true, status: true, residentName: true },
      });

      if (existing) {
        return {
          error:
            existing.status === "BLOCKED"
              ? "This slot is already blocked by management."
              : `This slot is already booked by ${existing.residentName}.`,
          status: 409,
        } as const;
      }

      const created = await tx.homeTheaterBooking.create({
        data: {
          bookingCode: generateTheaterBookingCode(),
          userId,
          bookingId,
          residentName,
          residentPhone,
          roomBedLabel,
          slotDateKey,
          slotKey,
          title,
          guestCount: action === "BLOCK" ? 1 : guestCount,
          notes,
          status: action === "BLOCK" ? "BLOCKED" : "BOOKED",
          bookedByRole: "ADMIN",
          bookedByName: user.name,
        },
      });

      return { booking: created } as const;
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: action === "BLOCK" ? "BLOCK_SLOT" : "CREATE",
      entity: "HOME_THEATER",
      entityId: result.booking.id,
      newValue: {
        bookingCode: result.booking.bookingCode,
        residentName: result.booking.residentName,
        slotDateKey: result.booking.slotDateKey,
        slotKey: result.booking.slotKey,
        status: result.booking.status,
      },
    });

    return NextResponse.json({ booking: result.booking }, { status: 201 });
  } catch (error) {
    console.error("Failed to create admin home theater booking:", error);
    return NextResponse.json(
      { error: "Failed to save Home Theater booking" },
      { status: 500 }
    );
  }
}
