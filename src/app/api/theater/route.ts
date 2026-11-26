import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import {
  ACTIVE_THEATER_STATUSES,
  VALID_THEATER_SLOT_KEYS,
  addDaysToDateKey,
  generateTheaterBookingCode,
  getIndiaNowDateKey,
  isTheaterSlotPassed,
} from "@/lib/home-theater";

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const todayKey = getIndiaNowDateKey();
    const dateParam = searchParams.get("date");
    const targetDate =
      dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayKey;

    const [activeStay, dayRows, myBookings] = await Promise.all([
      prisma.booking.findFirst({
        where: {
          customerId: user.id,
          bookingStatus: { in: ["CONFIRMED", "CHECKED_IN"] },
        },
        select: {
          id: true,
          guestName: true,
          guestPhone: true,
          room: { select: { roomNumber: true } },
          bed: { select: { bedNumber: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.homeTheaterBooking.findMany({
        where: {
          slotDateKey: targetDate,
          status: { in: ACTIVE_THEATER_STATUSES },
        },
        select: {
          id: true,
          slotDateKey: true,
          slotKey: true,
          status: true,
          userId: true,
          title: true,
        },
      }),
      prisma.homeTheaterBooking.findMany({
        where: { userId: user.id },
        orderBy: [{ slotDateKey: "desc" }, { createdAt: "desc" }],
      }),
    ]);

    const daySlots = dayRows.map((row) => ({
      id: row.id,
      slotDateKey: row.slotDateKey,
      slotKey: row.slotKey,
      status: row.status,
      isMine: row.userId === user.id,
      title: row.userId === user.id || row.status === "BLOCKED" ? row.title : null,
    }));

    return NextResponse.json({
      isActiveResident: Boolean(activeStay),
      date: targetDate,
      daySlots,
      myBookings,
    });
  } catch (error) {
    console.error("Failed to fetch home theater slots:", error);
    return NextResponse.json(
      { error: "Failed to load Home Theater schedule" },
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

    const activeStay = await prisma.booking.findFirst({
      where: {
        customerId: user.id,
        bookingStatus: { in: ["CONFIRMED", "CHECKED_IN"] },
      },
      select: {
        id: true,
        guestName: true,
        guestPhone: true,
        room: { select: { roomNumber: true } },
        bed: { select: { bedNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!activeStay) {
      return NextResponse.json(
        {
          error:
            "Only current active residents with a confirmed or checked-in stay can book the Home Theater amenity.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const slotDateKey = typeof body.slotDateKey === "string" ? body.slotDateKey.trim() : "";
    const slotKey = typeof body.slotKey === "string" ? body.slotKey.trim().toUpperCase() : "";
    const guestCountRaw = Number(body.guestCount ?? 2);
    const guestCount = Number.isFinite(guestCountRaw) ? Math.round(guestCountRaw) : 2;
    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim().slice(0, 80)
        : "Movie / Screening";
    const notes =
      typeof body.notes === "string" && body.notes.trim()
        ? body.notes.trim().slice(0, 240)
        : null;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(slotDateKey)) {
      return NextResponse.json({ error: "Please select a valid date." }, { status: 400 });
    }
    if (!VALID_THEATER_SLOT_KEYS.has(slotKey)) {
      return NextResponse.json({ error: "Please select a valid time slot." }, { status: 400 });
    }
    if (guestCount < 1 || guestCount > 12) {
      return NextResponse.json(
        { error: "Number of people must be between 1 and 12." },
        { status: 400 }
      );
    }

    const todayKey = getIndiaNowDateKey();
    const maxAllowedDate = addDaysToDateKey(todayKey, 14);
    if (slotDateKey < todayKey) {
      return NextResponse.json(
        { error: "Cannot book a Home Theater slot in the past." },
        { status: 400 }
      );
    }
    if (slotDateKey > maxAllowedDate) {
      return NextResponse.json(
        { error: "Home Theater can be booked up to 14 days in advance." },
        { status: 400 }
      );
    }
    if (isTheaterSlotPassed(slotDateKey, slotKey)) {
      return NextResponse.json(
        { error: "This time slot has already passed for today. Please choose a later slot." },
        { status: 400 }
      );
    }

    const roomBedLabel = `Room ${activeStay.room.roomNumber} · Bed ${activeStay.bed.bedNumber}`;

    const result = await prisma.$transaction(async (tx) => {
      const existingSlot = await tx.homeTheaterBooking.findFirst({
        where: {
          slotDateKey,
          slotKey,
          status: { in: ACTIVE_THEATER_STATUSES },
        },
        select: { id: true, status: true },
      });

      if (existingSlot) {
        return {
          error:
            existingSlot.status === "BLOCKED"
              ? "This slot is reserved by management / under maintenance."
              : "This slot is already booked. Please pick another slot or date.",
          status: 409,
        } as const;
      }

      const sameDayMine = await tx.homeTheaterBooking.findFirst({
        where: {
          userId: user.id,
          slotDateKey,
          status: "BOOKED",
        },
        select: { id: true },
      });

      if (sameDayMine) {
        return {
          error: "You already have a Home Theater booking on this date (max 1 slot per day).",
          status: 400,
        } as const;
      }

      const upcomingCount = await tx.homeTheaterBooking.count({
        where: {
          userId: user.id,
          slotDateKey: { gte: todayKey },
          status: "BOOKED",
        },
      });

      if (upcomingCount >= 2) {
        return {
          error: "You can hold up to 2 upcoming Home Theater bookings at a time.",
          status: 400,
        } as const;
      }

      const created = await tx.homeTheaterBooking.create({
        data: {
          bookingCode: generateTheaterBookingCode(),
          userId: user.id,
          bookingId: activeStay.id,
          residentName: activeStay.guestName || user.name,
          residentPhone: activeStay.guestPhone || user.phone || null,
          roomBedLabel,
          slotDateKey,
          slotKey,
          title,
          guestCount,
          notes,
          status: "BOOKED",
          bookedByRole: "RESIDENT",
          bookedByName: user.name,
        },
      });

      return { booking: created } as const;
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ booking: result.booking }, { status: 201 });
  } catch (error) {
    console.error("Failed to create home theater booking:", error);
    return NextResponse.json(
      { error: "Failed to book Home Theater slot" },
      { status: 500 }
    );
  }
}
