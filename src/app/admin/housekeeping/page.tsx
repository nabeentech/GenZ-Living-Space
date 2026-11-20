import React from "react";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { canAccessModule, getFirstAllowedAdminRoute } from "@/lib/permissions";
import HousekeepingClient from "./HousekeepingClient";

export const dynamic = "force-dynamic";

export default async function HousekeepingPage() {
  const user = await getSessionUser();
  if (!user || !canAccessModule(user, "housekeeping")) {
    redirect(getFirstAllowedAdminRoute(user));
  }
  const tasks = await prisma.housekeepingTask.findMany({
    include: {
      hostel: true,
      room: true,
      bed: true,
      assignee: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const hostels = await prisma.hostel.findMany({
    select: { id: true, name: true, city: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">
          Sanitization & Maintenance
        </span>
        <h1 className="text-3xl font-black text-white">Housekeeping Operations</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Real-time cleaning queue, linen replacements, and sanitization inspections.
        </p>
      </div>

      <HousekeepingClient initialTasks={tasks} hostels={hostels} />
    </div>
  );
}
