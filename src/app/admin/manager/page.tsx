import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BedDouble, ClipboardCheck, MessageSquare, NotebookTabs } from "lucide-react";
import { getSessionUser, ROLES } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PropertyManagerPanel() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");
  if (user.role !== ROLES.PROPERTY_MANAGER && user.role !== ROLES.SUPER_ADMIN) {
    redirect("/admin");
  }

  const [properties, activeBookings, availableBeds, openTasks] = await Promise.all([
    prisma.hostel.count({ where: { active: true } }),
    prisma.booking.count({ where: { bookingStatus: { in: ["CONFIRMED", "CHECKED_IN"] } } }),
    prisma.bed.count({ where: { active: true, status: "AVAILABLE" } }),
    prisma.housekeepingTask.count({ where: { status: { in: ["DIRTY", "CLEANING"] } } }),
  ]);

  const actions = [
    { title: "Bed Allocation Matrix", detail: "Monitor rooms and update live bed statuses across Madhapur.", href: "/admin/beds", icon: <BedDouble className="w-5 h-5" />, tone: "text-indigo-400" },
    { title: "Housekeeping Board", detail: "Coordinate cleaning, inspection, and maintenance queues.", href: "/admin/housekeeping", icon: <ClipboardCheck className="w-5 h-5" />, tone: "text-amber-400" },
    { title: "Bookings Management", detail: "Review reservations, occupancy, and guest stay details.", href: "/admin/bookings", icon: <NotebookTabs className="w-5 h-5" />, tone: "text-cyan-400" },
    { title: "Complaints & Support", detail: "Track resident issues and coordinate staff responses.", href: "/admin/complaints", icon: <MessageSquare className="w-5 h-5" />, tone: "text-rose-400" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">Property Operations</span>
        <h1 className="text-3xl font-black text-white mt-1">Manager Panel</h1>
        <p className="text-sm text-slate-400 mt-2">A focused view of occupancy, rooms, housekeeping, and resident operations.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          ["Active Properties", properties, "text-indigo-400"],
          ["Active Bookings", activeBookings, "text-cyan-400"],
          ["Available Beds", availableBeds, "text-emerald-400"],
          ["Cleaning Queue", openTasks, "text-amber-400"],
        ].map(([label, value, tone]) => (
          <div key={String(label)} className="p-5 rounded-2xl border border-slate-800 bg-[#101626]/80">
            <span className="text-xs font-bold text-slate-400">{label}</span>
            <span className={`block text-3xl font-black mt-2 ${tone}`}>{value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {actions.map((action) => (
          <Link key={action.href} href={action.href} className="group p-6 rounded-2xl border border-slate-800 bg-[#101626]/80 hover:border-slate-600 transition">
            <span className={`flex items-center justify-between ${action.tone}`}>
              {action.icon}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
            <h2 className="text-lg font-bold text-white mt-6">{action.title}</h2>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">{action.detail}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
