import React from "react";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { canAccessModule, getFirstAllowedAdminRoute } from "@/lib/permissions";
import ComplaintsClient from "./ComplaintsClient";

export const dynamic = "force-dynamic";

export default async function AdminComplaintsPage() {
  const user = await getSessionUser();
  if (!user || !canAccessModule(user, "complaints")) {
    redirect(getFirstAllowedAdminRoute(user));
  }
  const tickets = await prisma.supportTicket.findMany({
    include: {
      hostel: true,
      customer: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">
          Customer Happiness Desk
        </span>
        <h1 className="text-3xl font-black text-white">Support & Complaints</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Triage resident issues, reply to tickets, and maintain community satisfaction standards.
        </p>
      </div>

      <ComplaintsClient initialTickets={tickets} />
    </div>
  );
}
