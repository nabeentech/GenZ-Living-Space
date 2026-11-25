import React from "react";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { canAccessModule, canUserEdit, getFirstAllowedAdminRoute } from "@/lib/permissions";
import BedMatrixClient from "./BedMatrixClient";

export const dynamic = "force-dynamic";

export default async function AdminBedsPage() {
  const user = await getSessionUser();
  if (!user || !canAccessModule(user, "beds")) {
    redirect(getFirstAllowedAdminRoute(user));
  }
  const canEdit = canUserEdit(user);

  const hostels = await prisma.hostel.findMany({
    select: {
      id: true,
      name: true,
      city: true,
      rooms: {
        where: { active: true },
        orderBy: [{ floor: "asc" }, { roomNumber: "asc" }],
        select: {
          id: true,
          roomNumber: true,
          floor: true,
          building: true,
          capacity: true,
          genderCategory: true,
          status: true,
          isAC: true,
          roomType: {
            select: { id: true, name: true, slug: true },
          },
          beds: {
            where: { active: true },
            orderBy: { bedNumber: "asc" },
            select: {
              id: true,
              bedNumber: true,
              tier: true,
              status: true,
              currentOccupantId: true,
              bookings: {
                where: {
                  bookingStatus: { in: ["CONFIRMED", "CHECKED_IN"] },
                },
                take: 1,
                select: {
                  id: true,
                  customerId: true,
                  bookingReference: true,
                  guestName: true,
                  guestPhone: true,
                  stayType: true,
                  isOpenEnded: true,
                  balanceAmount: true,
                  checkInDate: true,
                  checkOutDate: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">
          Real-Time Inventory
        </span>
        <h1 className="text-3xl font-black text-white">Visual Bed Allocation Matrix</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Floor-by-floor, room-by-room bed allocation grid with real-time status and allocation controls.
        </p>
      </div>

      <BedMatrixClient hostels={hostels} canEdit={canEdit} />
    </div>
  );
}
