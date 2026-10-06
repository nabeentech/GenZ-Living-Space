import React from "react";
import prisma from "@/lib/prisma";
import ReportsClient from "./ReportsClient";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const hostels = await prisma.hostel.findMany({
    include: {
      bookings: {
        include: { payments: true },
      },
      rooms: {
        include: { beds: true },
      },
    },
  });

  const totalBookings = await prisma.booking.count();
  const confirmedBookings = await prisma.booking.count({
    where: { bookingStatus: "CONFIRMED" },
  });
  const checkedInBookings = await prisma.booking.count({
    where: { bookingStatus: "CHECKED_IN" },
  });
  const checkedOutBookings = await prisma.booking.count({
    where: { bookingStatus: "CHECKED_OUT" },
  });
  const cancelledBookings = await prisma.booking.count({
    where: { bookingStatus: "CANCELLED" },
  });

  const stats = {
    totalBookings,
    confirmedBookings,
    checkedInBookings,
    checkedOutBookings,
    cancelledBookings,
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">
          Executive Analytics
        </span>
        <h1 className="text-3xl font-black text-white">Financial & Occupancy Reports</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Comprehensive performance breakdown, hostel revenue share, and CSV data export.
        </p>
      </div>

      <ReportsClient hostels={hostels} stats={stats} />
    </div>
  );
}
