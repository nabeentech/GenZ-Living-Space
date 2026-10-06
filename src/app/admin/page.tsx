import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, ROLES } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  Calendar,
  Users,
  CreditCard,
  Bed as BedIcon,
  Sparkles,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const sessionUser = await getSessionUser();
  if (sessionUser?.role === ROLES.RECEPTIONIST) redirect("/admin/receptionist");
  if (sessionUser?.role === ROLES.PROPERTY_MANAGER) redirect("/admin/manager");

  // Aggregate real-time statistics
  const totalBookings = await prisma.booking.count();
  const confirmedBookings = await prisma.booking.count({
    where: { bookingStatus: { in: ["CONFIRMED", "CHECKED_IN"] } },
  });

  const allBeds = await prisma.bed.count({ where: { active: true } });
  const occupiedBeds = await prisma.bed.count({
    where: { status: "OCCUPIED" },
  });
  const cleaningBeds = await prisma.bed.count({
    where: { status: "CLEANING" },
  });
  const availableBeds = await prisma.bed.count({
    where: { status: "AVAILABLE" },
  });

  const occupancyRate = allBeds > 0 ? Math.round((occupiedBeds / allBeds) * 100) : 0;

  // Payments & Revenue
  const payments = await prisma.payment.findMany({
    where: { status: "CAPTURED" },
    select: { amount: true },
  });
  const totalRevenue = payments.reduce((acc, p) => acc + p.amount, 0);

  // Complaints & Refunds
  const openComplaints = await prisma.supportTicket.count({
    where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
  });
  const refundRequests = await prisma.refund.count({
    where: { status: "REQUESTED" },
  });

  // Hostels Breakdown
  const hostels = await prisma.hostel.findMany({
    include: {
      rooms: {
        include: {
          beds: true,
        },
      },
      bookings: {
        where: { bookingStatus: { in: ["CONFIRMED", "CHECKED_IN"] } },
      },
    },
  });

  // Recent 6 Bookings
  const recentBookings = await prisma.booking.findMany({
    take: 6,
    orderBy: { createdAt: "desc" },
    include: {
      hostel: true,
      room: true,
      bed: true,
    },
  });

  // Booking Extensions
  const pendingExtensions = await prisma.bookingExtension.count({
    where: { status: "REQUESTED" },
  });
  const pendingExtensionRevenue = await prisma.bookingExtension.aggregate({
    where: { status: "REQUESTED", additionalAmount: { gt: 0 } },
    _sum: { additionalAmount: true },
  });

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">
            Operations Command Center
          </span>
          <h1 className="text-3xl font-black text-white">Platform Overview</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time metrics across both GenZ Living Space properties.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/admin/checkin">
            <Button variant="glow" size="sm">
              Reception QR Check-In
            </Button>
          </Link>
          <Link href="/admin/walkin">
            <Button variant="outline" size="sm">
              + Walk-In Booking
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Bookings */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-[#101626]/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Total Bookings</span>
            <Calendar className="w-4 h-4 text-white" />
          </div>
          <span className="text-2xl font-black text-white block">
            {totalBookings}
          </span>
          <span className="text-[10px] text-emerald-400 font-semibold">
            {confirmedBookings} active/confirmed
          </span>
        </div>

        {/* Occupancy Rate */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-[#101626]/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Occupancy</span>
            <TrendingUp className="w-4 h-4 text-pink-400" />
          </div>
          <span className="text-2xl font-black text-white block">
            {occupancyRate}%
          </span>
          <span className="text-[10px] text-slate-400">
            {occupiedBeds} of {allBeds} beds occupied
          </span>
        </div>

        {/* Available Beds */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-[#101626]/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Available Beds</span>
            <BedIcon className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-black text-emerald-400 block">
            {availableBeds}
          </span>
          <span className="text-[10px] text-amber-400">
            {cleaningBeds} in cleaning queue
          </span>
        </div>

        {/* Total Revenue */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-[#101626]/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Gross Revenue</span>
            <CreditCard className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="text-2xl font-black text-white block">
            ₹{totalRevenue.toLocaleString()}
          </span>
          <span className="text-[10px] text-emerald-400">Server captured</span>
        </div>

        {/* Open Complaints */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-[#101626]/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Open Tickets</span>
            <HelpCircle className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-2xl font-black text-amber-400 block">
            {openComplaints}
          </span>
          <span className="text-[10px] text-slate-400">Pending staff reply</span>
        </div>

        {/* Refund Requests */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-[#101626]/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Refund Queue</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <span className="text-2xl font-black text-rose-400 block">
            {refundRequests}
          </span>
          <span className="text-[10px] text-slate-400">Requires review</span>
        </div>

        {/* Pending Stay Extensions */}
        <Link href="/admin/extensions">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-[#101626]/80 space-y-2 hover:border-indigo-500/50 transition cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Stay Extensions</span>
              <MapPin className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-2xl font-black text-indigo-400 block">
              {pendingExtensions}
            </span>
            <span className="text-[10px] text-indigo-400">
              ₹{(pendingExtensionRevenue._sum.additionalAmount || 0).toLocaleString()} pending
            </span>
          </div>
        </Link>
      </div>

      {/* Hostel Performance Breakdown */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-[#101626]/80 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">Property Performance</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time room occupancy, bed allocation, and live guest counts.
            </p>
          </div>
          <Link href="/admin/beds">
            <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Open Bed Allocation Matrix
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {hostels.map((h) => {
            let totalHostelBeds = 0;
            let occupiedHostelBeds = 0;
            h.rooms.forEach((r) => {
              r.beds.forEach((b) => {
                totalHostelBeds++;
                if (b.status === "OCCUPIED") occupiedHostelBeds++;
              });
            });

            const pct =
              totalHostelBeds > 0
                ? Math.round((occupiedHostelBeds / totalHostelBeds) * 100)
                : 0;

            return (
              <div
                key={h.id}
                className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-white">{h.name}</h4>
                  <Badge variant="indigo" size="sm">
                    {h.city}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Occupancy</span>
                    <span className="font-bold text-white">{pct}%</span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
                  <div>
                    <span className="text-slate-500 block">Total Beds</span>
                    <span className="font-bold text-white">{totalHostelBeds}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Active Bookings</span>
                    <span className="font-bold text-emerald-400">
                      {h.bookings.length}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Bookings Table */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-[#111827]/80 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Recent Activity</h3>
          <Link href="/admin/bookings">
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              View All Bookings
            </Button>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3.5">Ref #</th>
                <th className="p-3.5">Resident</th>
                <th className="p-3.5">Hostel & Room</th>
                <th className="p-3.5">Bed</th>
                <th className="p-3.5">Check-In</th>
                <th className="p-3.5">Total</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {recentBookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-900/50 transition">
                  <td className="p-3.5 font-mono font-bold text-white">
                    {b.bookingReference}
                  </td>
                  <td className="p-3.5">
                    <span className="font-bold text-white block">{b.guestName}</span>
                    <span className="text-[11px] text-slate-400">{b.guestPhone}</span>
                  </td>
                  <td className="p-3.5">
                    <span className="text-white block">{b.hostel.name}</span>
                    <span className="text-[11px] text-slate-400">
                      Room {b.room.roomNumber}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <Badge variant="indigo" size="sm">
                      {b.bed.bedNumber}
                    </Badge>
                  </td>
                  <td className="p-3.5">
                    {new Date(b.checkInDate).toLocaleDateString()}
                  </td>
                  <td className="p-3.5 font-black text-white">
                    ₹{b.totalAmount.toLocaleString()}
                  </td>
                  <td className="p-3.5">
                    <Badge
                      variant={
                        b.bookingStatus === "CONFIRMED"
                          ? "available"
                          : b.bookingStatus === "CHECKED_IN"
                          ? "indigo"
                          : b.bookingStatus === "CANCELLED"
                          ? "danger"
                          : "default"
                      }
                      size="sm"
                    >
                      {b.bookingStatus}
                    </Badge>
                  </td>
                  <td className="p-3.5 text-right">
                    <Link href={`/admin/bookings?search=${b.bookingReference}`}>
                      <Button variant="outline" size="sm">
                        Manage
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
