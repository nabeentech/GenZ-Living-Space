import React from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import {
  canAccessModule,
  canUserDelete,
  canUserEdit,
  getFirstAllowedAdminRoute,
} from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { getIndiaNowDateKey } from "@/lib/home-theater";
import {
  AdminTheaterClient,
  AdminTheaterBookingRow,
  ActiveResidentOption,
} from "./AdminTheaterClient";

export const dynamic = "force-dynamic";

export default async function AdminTheaterPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");

  if (!canAccessModule(user, "theater")) {
    redirect(getFirstAllowedAdminRoute(user));
  }

  const todayKey = getIndiaNowDateKey();

  const [bookings, activeStays] = await Promise.all([
    prisma.homeTheaterBooking.findMany({
      orderBy: [{ slotDateKey: "desc" }, { createdAt: "desc" }],
    }),
    prisma.booking.findMany({
      where: {
        bookingStatus: { in: ["CONFIRMED", "CHECKED_IN"] },
      },
      select: {
        id: true,
        guestName: true,
        guestPhone: true,
        room: { select: { roomNumber: true } },
        bed: { select: { bedNumber: true } },
      },
      orderBy: { guestName: "asc" },
    }),
  ]);

  const serializedBookings: AdminTheaterBookingRow[] = bookings.map((b) => ({
    id: b.id,
    bookingCode: b.bookingCode,
    residentName: b.residentName,
    residentPhone: b.residentPhone,
    roomBedLabel: b.roomBedLabel,
    slotDateKey: b.slotDateKey,
    slotKey: b.slotKey,
    title: b.title,
    guestCount: b.guestCount,
    notes: b.notes,
    status: b.status,
    bookedByRole: b.bookedByRole,
    bookedByName: b.bookedByName,
    createdAt: b.createdAt.toISOString(),
  }));

  const residentOptions: ActiveResidentOption[] = activeStays.map((s) => ({
    bookingId: s.id,
    guestName: s.guestName,
    guestPhone: s.guestPhone,
    roomBedLabel: `Room ${s.room.roomNumber} · Bed ${s.bed.bedNumber}`,
  }));

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">
          Resident Amenity Desk · Free Access
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          Home Theater Bookings
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          View daily screening slots, reserve a free slot for current residents, or block maintenance/event timings.
        </p>
      </div>

      <AdminTheaterClient
        initialDate={todayKey}
        initialBookings={serializedBookings}
        activeResidents={residentOptions}
        canEdit={canUserEdit(user)}
        canDelete={canUserDelete(user)}
      />
    </div>
  );
}
