import React from "react";
import prisma from "@/lib/prisma";
import WalkInClient from "./WalkInClient";

export const dynamic = "force-dynamic";

export default async function WalkInPage() {
  const hostels = await prisma.hostel.findMany({
    where: { active: true },
    include: {
      rooms: {
        where: { active: true, status: "ACTIVE" },
        include: {
          roomType: true,
          beds: {
            where: { active: true, status: "AVAILABLE" },
          },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">
          Reception Desk
        </span>
        <h1 className="text-3xl font-black text-white">Walk-In Reservation</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Process manual on-spot bookings for guests arriving directly at the hostel counter.
        </p>
      </div>

      <WalkInClient hostels={hostels} />
    </div>
  );
}
