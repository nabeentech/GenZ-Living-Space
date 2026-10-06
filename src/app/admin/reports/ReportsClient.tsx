"use client";

import React from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Download, BarChart2, TrendingUp, DollarSign, Bed, Calendar } from "lucide-react";

interface ReportsClientProps {
  hostels: any[];
  stats: {
    totalBookings: number;
    confirmedBookings: number;
    checkedInBookings: number;
    checkedOutBookings: number;
    cancelledBookings: number;
  };
}

export const ReportsClient: React.FC<ReportsClientProps> = ({ hostels, stats }) => {
  // Aggregate per-hostel data
  const hostelSummaries = hostels.map((h) => {
    let revenue = 0;
    h.bookings.forEach((b: any) => {
      if (b.bookingStatus !== "CANCELLED") {
        revenue += b.totalAmount;
      }
    });

    let totalBeds = 0;
    let occupiedBeds = 0;
    h.rooms.forEach((r: any) => {
      r.beds.forEach((bed: any) => {
        totalBeds++;
        if (bed.status === "OCCUPIED") occupiedBeds++;
      });
    });

    const occupancyRate =
      totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    return {
      name: h.name,
      city: h.city,
      totalBeds,
      occupiedBeds,
      occupancyRate,
      bookingsCount: h.bookings.length,
      revenue,
    };
  });

  const totalGrossRevenue = hostelSummaries.reduce((acc, h) => acc + h.revenue, 0);

  // Client-side CSV download
  const handleExportCSV = () => {
    const headers = [
      "Hostel Name",
      "City",
      "Total Beds",
      "Occupied Beds",
      "Occupancy %",
      "Bookings Count",
      "Gross Revenue (INR)",
    ];

    const rows = hostelSummaries.map((h) => [
      `"${h.name}"`,
      `"${h.city}"`,
      h.totalBeds,
      h.occupiedBeds,
      `${h.occupancyRate}%`,
      h.bookingsCount,
      h.revenue,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `genz_living_space_report_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Export Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-[#111827]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
            Total Network Revenue
          </span>
          <span className="text-3xl font-black text-emerald-400">
            ₹{totalGrossRevenue.toLocaleString()}
          </span>
        </div>

        <Button
          variant="glow"
          size="md"
          onClick={handleExportCSV}
          leftIcon={<Download className="w-4 h-4" />}
        >
          Export CSV Report
        </Button>
      </div>

      {/* Properties Performance Matrix Table */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-[#101626]/80 space-y-4">
        <h3 className="text-lg font-bold text-white">Property Revenue & Occupancy Share</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3.5">Hostel Property</th>
                <th className="p-3.5">Location</th>
                <th className="p-3.5">Beds (Occupied / Total)</th>
                <th className="p-3.5">Occupancy Rate</th>
                <th className="p-3.5">Total Bookings</th>
                <th className="p-3.5 text-right">Revenue Generated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {hostelSummaries.map((h, i) => (
                <tr key={i} className="hover:bg-slate-900/50">
                  <td className="p-3.5 font-bold text-white text-sm">{h.name}</td>
                  <td className="p-3.5">
                    <Badge variant="indigo" size="sm">
                      {h.city}
                    </Badge>
                  </td>
                  <td className="p-3.5 font-medium text-slate-200">
                    {h.occupiedBeds} / {h.totalBeds} beds
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{h.occupancyRate}%</span>
                      <div className="w-20 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${h.occupancyRate}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5 font-bold text-white">{h.bookingsCount}</td>
                  <td className="p-3.5 font-black text-emerald-400 text-sm text-right">
                    ₹{h.revenue.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bookings Status Distribution */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 text-center space-y-1">
          <span className="text-2xl font-black text-white">{stats.totalBookings}</span>
          <span className="text-xs text-slate-400 block font-semibold">Total Reservations</span>
        </div>
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 text-center space-y-1">
          <span className="text-2xl font-black text-emerald-400">{stats.confirmedBookings}</span>
          <span className="text-xs text-slate-400 block font-semibold">Confirmed Upcoming</span>
        </div>
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 text-center space-y-1">
          <span className="text-2xl font-black text-indigo-400">{stats.checkedInBookings}</span>
          <span className="text-xs text-slate-400 block font-semibold">In-House Stays</span>
        </div>
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 text-center space-y-1">
          <span className="text-2xl font-black text-rose-400">{stats.cancelledBookings}</span>
          <span className="text-xs text-slate-400 block font-semibold">Cancelled & Refunded</span>
        </div>
      </div>
    </div>
  );
};

export default ReportsClient;
