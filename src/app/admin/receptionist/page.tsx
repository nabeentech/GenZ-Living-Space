import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen, LogIn, UserPlus } from "lucide-react";
import { getSessionUser, ROLES } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ReceptionistPanel() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");
  if (user.role !== ROLES.RECEPTIONIST && user.role !== ROLES.SUPER_ADMIN) {
    redirect("/admin");
  }

  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const [checkIns, checkOuts, activeBookings] = await Promise.all([
    prisma.booking.count({ where: { checkInDate: { gte: startOfDay, lte: endOfDay } } }),
    prisma.booking.count({ where: { checkOutDate: { gte: startOfDay, lte: endOfDay } } }),
    prisma.booking.count({ where: { bookingStatus: { in: ["CONFIRMED", "CHECKED_IN"] } } }),
  ]);

  const actions = [
    { title: "QR Check-In / Out Desk", detail: "Verify guests, assign keys, and release beds to cleaning.", href: "/admin/checkin", icon: <LogIn className="w-5 h-5" />, tone: "text-cyan-400" },
    { title: "Walk-In Reservation", detail: "Create an instant cash, UPI, or card reservation.", href: "/admin/walkin", icon: <UserPlus className="w-5 h-5" />, tone: "text-emerald-400" },
    { title: "Bookings Management", detail: "Search reservations and review guest details.", href: "/admin/bookings", icon: <BookOpen className="w-5 h-5" />, tone: "text-indigo-400" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <span className="text-xs uppercase font-extrabold tracking-widest text-cyan-400">Reception Desk</span>
        <h1 className="text-3xl font-black text-white mt-1">Front Desk Panel</h1>
        <p className="text-sm text-slate-400 mt-2">Everything needed for today&apos;s arrivals, departures, and walk-in guests.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          ["Today&apos;s Check-Ins", checkIns, "text-cyan-400"],
          ["Today&apos;s Check-Outs", checkOuts, "text-amber-400"],
          ["Active Bookings", activeBookings, "text-emerald-400"],
        ].map(([label, value, tone]) => (
          <div key={String(label)} className="p-5 rounded-2xl border border-slate-800 bg-[#101626]/80">
            <span className="text-xs font-bold text-slate-400">{label}</span>
            <span className={`block text-3xl font-black mt-2 ${tone}`}>{value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
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
