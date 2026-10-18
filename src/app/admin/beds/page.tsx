import React from "react";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { canUserEdit } from "@/lib/permissions";
import BedMatrixClient from "./BedMatrixClient";

export const dynamic = "force-dynamic";

export default async function AdminBedsPage() {
  const user = await getSessionUser();
  const canEdit = canUserEdit(user);

  const hostels = await prisma.hostel.findMany({
    include: {
      rooms: {
        include: {
          roomType: true,
          beds: {
            include: {
              bookings: {
                where: {
                  bookingStatus: { in: ["CONFIRMED", "CHECKED_IN"] },
                },
                take: 1,
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
