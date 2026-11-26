import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { hasTheaterSlotStarted } from "@/lib/home-theater";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.homeTheaterBooking.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    if (existing.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (existing.status !== "BOOKED") {
      return NextResponse.json(
        { error: "Only active booked slots can be cancelled." },
        { status: 400 }
      );
    }
    if (hasTheaterSlotStarted(existing.slotDateKey, existing.slotKey)) {
      return NextResponse.json(
        { error: "This show slot has already started and cannot be self-cancelled." },
        { status: 400 }
      );
    }

    const booking = await prisma.homeTheaterBooking.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ booking });
  } catch (error) {
    console.error("Failed to cancel home theater booking:", error);
    return NextResponse.json(
      { error: "Failed to cancel booking" },
      { status: 500 }
    );
  }
}
