import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, ROLES } from "@/lib/auth";
import { canAccessModule, getFirstAllowedAdminRoute, isFinancialsHidden } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import DashboardFilterBar from "@/components/admin/DashboardFilterBar";
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
  LogOut,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ hostelId?: string; range?: string }>;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/auth/login");
  if (sessionUser.role === ROLES.RECEPTIONIST) redirect("/admin/receptionist");
  if (sessionUser.role === ROLES.PROPERTY_MANAGER) redirect("/admin/manager");

  if (!canAccessModule(sessionUser, "dashboard")) {
    redirect(getFirstAllowedAdminRoute(sessionUser));
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const selectedHostelId = resolvedParams.hostelId || "all";
  const selectedRange = ["today", "thisMonth"].includes(resolvedParams.range || "")
    ? (resolvedParams.range as string)
    : "all";

  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  let rangeStart: Date | undefined;
  if (selectedRange === "today") {
    rangeStart = new Date(`${todayKey}T00:00:00+05:30`);
  } else if (selectedRange === "thisMonth") {
    rangeStart = new Date(`${todayKey.slice(0, 7)}-01T00:00:00+05:30`);
  }

  const hostelWhere = selectedHostelId !== "all" ? { hostelId: selectedHostelId } : {};
  const bookingDateWhere = rangeStart ? { createdAt: { gte: rangeStart } } : {};
  const paymentDateWhere = rangeStart ? { createdAt: { gte: rangeStart } } : {};

  const hideFinancials = isFinancialsHidden(sessionUser);
  const canCheckIn = canAccessModule(sessionUser, "checkin");
  const canWalkIn = canAccessModule(sessionUser, "walkin");
  const canBeds = canAccessModule(sessionUser, "beds");
  const canBookings = canAccessModule(sessionUser, "bookings");
  const canExtensions = canAccessModule(sessionUser, "extensions");
  const canPayments = canAccessModule(sessionUser, "payments");
  const canPricing = canAccessModule(sessionUser, "pricing");

  const next3DaysEnd = new Date();
  next3DaysEnd.setDate(next3DaysEnd.getDate() + 3);

  // Aggregate real-time statistics in parallel
  const [
    allHostelOptions,
    totalBookings,
    walkInBookingsCount,
    confirmedBookings,
    monthlyTenantsCount,
    allBeds,
    occupiedBeds,
    cleaningBeds,
    availableBeds,
    paymentRevenueAgg,
    openComplaints,
    refundRequests,
    hostels,
    recentBookings,
    pendingExtensions,
    pendingExtensionRevenue,
    pendingBalanceAgg,
    vacatingBookings,
  ] = await Promise.all([
    prisma.hostel.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.booking.count({ where: { ...hostelWhere, ...bookingDateWhere } }),
    prisma.booking.count({
      where: { ...hostelWhere, ...bookingDateWhere, bookingReference: { startsWith: "GZ-W" } },
    }),
    prisma.booking.count({
      where: { ...hostelWhere, bookingStatus: { in: ["CONFIRMED", "CHECKED_IN"] } },
    }),
    prisma.booking.count({
      where: {
        ...hostelWhere,
        stayType: "MONTHLY",
        bookingStatus: { in: ["CONFIRMED", "CHECKED_IN"] },
      },
    }),
    prisma.bed.count({ where: { active: true, ...hostelWhere } }),
    prisma.bed.count({ where: { status: "OCCUPIED", ...hostelWhere } }),
    prisma.bed.count({ where: { status: "CLEANING", ...hostelWhere } }),
    prisma.bed.count({ where: { status: "AVAILABLE", ...hostelWhere } }),
    prisma.payment.aggregate({
      where: {
        status: "CAPTURED",
        ...paymentDateWhere,
        ...(selectedHostelId !== "all" ? { booking: { hostelId: selectedHostelId } } : {}),
      },
      _sum: { amount: true },
    }),
    prisma.supportTicket.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] }, ...hostelWhere },
    }),
    prisma.refund.count({
      where: {
        status: "REQUESTED",
        ...(selectedHostelId !== "all" ? { booking: { hostelId: selectedHostelId } } : {}),
      },
    }),
    prisma.hostel.findMany({
      where: selectedHostelId !== "all" ? { id: selectedHostelId } : undefined,
      select: {
        id: true,
        name: true,
        city: true,
        rooms: {
          where: { active: true },
          select: {
            beds: {
              where: { active: true },
              select: { status: true },
            },
          },
        },
        _count: {
          select: {
            bookings: {
              where: { bookingStatus: { in: ["CONFIRMED", "CHECKED_IN"] } },
            },
          },
        },
      },
    }),
    prisma.booking.findMany({
      where: { ...hostelWhere, ...bookingDateWhere },
      take: 6,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        bookingReference: true,
        guestName: true,
        guestPhone: true,
        checkInDate: true,
        totalAmount: true,
        bookingStatus: true,
        hostel: { select: { name: true } },
        room: { select: { roomNumber: true } },
        bed: { select: { bedNumber: true } },
      },
    }),
    prisma.bookingExtension.count({
      where: {
        status: "REQUESTED",
        ...(selectedHostelId !== "all" ? { booking: { hostelId: selectedHostelId } } : {}),
      },
    }),
    prisma.bookingExtension.aggregate({
      where: {
        status: "REQUESTED",
        additionalAmount: { gt: 0 },
        ...(selectedHostelId !== "all" ? { booking: { hostelId: selectedHostelId } } : {}),
      },
      _sum: { additionalAmount: true },
    }),
    prisma.booking.aggregate({
      where: {
        ...hostelWhere,
        bookingStatus: { notIn: ["CANCELLED", "REFUNDED"] },
        balanceAmount: { gt: 0 },
      },
      _sum: { balanceAmount: true },
    }),
    prisma.booking.findMany({
      where: {
        ...hostelWhere,
        bookingStatus: { in: ["CONFIRMED", "CHECKED_IN"] },
        OR: [
          { stayType: "MONTHLY", isOpenEnded: false },
          { stayType: "DAILY", checkOutDate: { lte: next3DaysEnd } },
        ],
      },
      include: {
        hostel: { select: { name: true } },
        room: { select: { roomNumber: true } },
        bed: { select: { bedNumber: true } },
      },
      orderBy: { checkOutDate: "asc" },
      take: 10,
    }),
  ]);

  const occupancyRate = allBeds > 0 ? Math.round((occupiedBeds / allBeds) * 100) : 0;
  const totalRevenue = paymentRevenueAgg._sum.amount ?? 0;
  const totalPendingBalance = pendingBalanceAgg._sum.balanceAmount ?? 0;

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
            Real-time metrics for GenZ Colive PG &amp; Guest Rooms.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canCheckIn && (
            <Link href="/admin/checkin">
              <Button variant="glow" size="sm">
                Reception QR Check-In
              </Button>
            </Link>
          )}
          {canWalkIn && (
            <Link href="/admin/walkin">
              <Button variant="outline" size="sm">
                + Walk-In Booking
              </Button>
            </Link>
          )}
          {!canCheckIn && !canWalkIn && canPayments && (
            <Link href="/admin/payments">
              <Button variant="glow" size="sm">
                Payments &amp; Ledger
              </Button>
            </Link>
          )}
          {!canCheckIn && !canWalkIn && !canPayments && canPricing && (
            <Link href="/admin/pricing">
              <Button variant="outline" size="sm">
                Pricing Management
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <DashboardFilterBar
        hostels={allHostelOptions}
        selectedHostelId={selectedHostelId}
        selectedRange={selectedRange}
      />

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Total Bookings */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-[#101626]/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Total Bookings</span>
            <Calendar className="w-4 h-4 text-white" />
          </div>
          <span className="text-2xl font-black text-white block">
            {totalBookings}
          </span>
          <span className="text-[10px] text-emerald-400 font-semibold block">
            {confirmedBookings} active · {walkInBookingsCount} Walk-In / {Math.max(0, totalBookings - walkInBookingsCount)} Online
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

        {/* Money Received */}
        <Link href="/admin/reports">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-[#101626]/80 space-y-2 hover:border-cyan-500/40 transition cursor-pointer h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Money Received</span>
              <CreditCard className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="text-2xl font-black text-white block">
              {hideFinancials ? (
                <span className="font-mono text-slate-500 font-bold" title="Financial figures restricted for your role">
                  ••••••
                </span>
              ) : (
                `₹${totalRevenue.toLocaleString("en-IN")}`
              )}
            </span>
            <span className="text-[10px] text-amber-300 font-semibold block">
              {hideFinancials
                ? "Financials Restricted"
                : `₹${totalPendingBalance.toLocaleString("en-IN")} yet to come →`}
            </span>
          </div>
        </Link>

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
        {canExtensions ? (
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
                {hideFinancials ? "•••••• pending" : `₹${(pendingExtensionRevenue._sum.additionalAmount || 0).toLocaleString()} pending`}
              </span>
            </div>
          </Link>
        ) : (
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-[#101626]/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Stay Extensions</span>
              <MapPin className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-2xl font-black text-indigo-400 block">
              {pendingExtensions}
            </span>
            <span className="text-[10px] text-indigo-400">
              {hideFinancials ? "•••••• pending" : `₹${(pendingExtensionRevenue._sum.additionalAmount || 0).toLocaleString()} pending`}
            </span>
          </div>
        )}

        {/* Monthly Tenants */}
        <Link href="/admin/customers">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-[#101626]/80 space-y-2 hover:border-indigo-500/40 transition cursor-pointer h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Monthly Tenants</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-2xl font-black text-white block">
              {monthlyTenantsCount}
            </span>
            <span className="text-[10px] text-indigo-300 font-semibold">
              Active month-to-month residents
            </span>
          </div>
        </Link>

        {/* Ready to Vacate / Notice */}
        <Link href="/admin/bookings?status=CHECKED_IN">
          <div className="glass-panel p-5 rounded-2xl border border-amber-500/20 bg-[#101626]/80 space-y-2 hover:border-amber-500/50 transition cursor-pointer h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300">Ready to Vacate</span>
              <LogOut className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-2xl font-black text-amber-300 block">
              {vacatingBookings.length}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">
              Notice active or checking out soon
            </span>
          </div>
        </Link>
      </div>

      {/* Ready to Vacate / Notice Active List */}
      {vacatingBookings.length > 0 && (
        <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-amber-500/20 bg-[#101626]/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <LogOut className="w-4 h-4 text-amber-400" />
                Ready to Vacate / Notice Active ({vacatingBookings.length})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Residents who gave vacate notice or daily guests scheduled to check out soon.
              </p>
            </div>
            <Link href="/admin/checkin">
              <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Open Check-Out Desk
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {vacatingBookings.map((vb) => (
              <div key={vb.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3.5 text-xs space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-white truncate">{vb.guestName}</span>
                  <Badge variant="occupied" size="sm">
                    {vb.stayType === "MONTHLY" ? "Notice" : "Daily Out"}
                  </Badge>
                </div>
                <div className="text-slate-400">
                  {vb.hostel?.name} · Rm {vb.room?.roomNumber} ({vb.bed?.bedNumber})
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-amber-300 font-semibold">
                    Vacates: {new Date(vb.checkOutDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                  {!hideFinancials && vb.balanceAmount > 0 && (
                    <span className="text-rose-300 font-bold">Due ₹{vb.balanceAmount.toLocaleString("en-IN")}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hostel Performance Breakdown */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-[#101626]/80 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">Property Performance</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time room occupancy, bed allocation, and live guest counts.
            </p>
          </div>
          {canBeds && (
            <Link href="/admin/beds">
              <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Open Bed Allocation Matrix
              </Button>
            </Link>
          )}
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
                      {h._count.bookings}
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
          {canBookings && (
            <Link href="/admin/bookings">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                View All Bookings
              </Button>
            </Link>
          )}
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
                    {new Date(b.checkInDate).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </td>
                  <td className="p-3.5 font-black text-white">
                    {hideFinancials ? (
                      <span className="font-mono text-slate-500 font-bold text-xs" title="Financial figures restricted">
                        ••••••
                      </span>
                    ) : (
                      `₹${b.totalAmount.toLocaleString()}`
                    )}
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
                    {canBookings ? (
                      <Link href={`/admin/bookings?search=${b.bookingReference}`}>
                        <Button variant="outline" size="sm">
                          Manage
                        </Button>
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-600 font-mono">—</span>
                    )}
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
