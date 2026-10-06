import React from "react";
import Link from "next/link";
import prisma from "@/lib/prisma";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { ArrowRight, Calendar, CreditCard, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ExtensionsPage() {
  const extensions = await prisma.bookingExtension.findMany({
    include: {
      booking: {
        include: {
          hostel: true,
          room: true,
          bed: true,
          customer: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const pendingExtensions = extensions.filter((e) => e.status === "REQUESTED");
  const confirmedExtensions = extensions.filter((e) => e.status === "CONFIRMED");
  const cancelledExtensions = extensions.filter((e) => e.status === "CANCELLED");

  const totalAdditionalRevenue = extensions
    .filter((e) => e.status === "CONFIRMED")
    .reduce((sum, e) => sum + e.additionalAmount, 0);

  const pendingPayments = extensions
    .filter((e) => e.status === "REQUESTED" && e.additionalAmount > 0)
    .reduce((sum, e) => sum + e.additionalAmount, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">
          Stay Management
        </span>
        <h1 className="text-3xl font-black text-white">Booking Extensions</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Track all stay extensions, monitor additional charges, and manage extension payments.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-slate-800 bg-[#101626]/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Total Extensions</span>
            <Calendar className="w-4 h-4 text-white" />
          </div>
          <span className="text-2xl font-black text-white block">
            {extensions.length}
          </span>
          <span className="text-[10px] text-slate-400">All time</span>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-[#101626]/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Pending Review</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-2xl font-black text-amber-400 block">
            {pendingExtensions.length}
          </span>
          <span className="text-[10px] text-amber-400">
            ₹{pendingPayments.toLocaleString()} due
          </span>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-[#101626]/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Confirmed</span>
            <Calendar className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-black text-emerald-400 block">
            {confirmedExtensions.length}
          </span>
          <span className="text-[10px] text-emerald-400">Active extensions</span>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-[#101626]/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Additional Revenue</span>
            <CreditCard className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="text-2xl font-black text-cyan-400 block">
            ₹{totalAdditionalRevenue.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400">Confirmed extensions</span>
        </div>
      </div>

      {/* Extensions Table */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-[#111827]/80 space-y-4">
        <h3 className="text-xl font-bold text-white">All Extensions</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3.5">Booking Ref</th>
                <th className="p-3.5">Guest</th>
                <th className="p-3.5">Hostel</th>
                <th className="p-3.5">Original Checkout</th>
                <th className="p-3.5">New Checkout</th>
                <th className="p-3.5">Extra Days</th>
                <th className="p-3.5">Amount</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {extensions.map((ext) => {
                const daysExtended = Math.ceil(
                  (new Date(ext.newCheckOut).getTime() - new Date(ext.originalCheckOut).getTime()) / (1000 * 60 * 60 * 24)
                );

                return (
                  <tr key={ext.id} className="hover:bg-slate-900/50 transition">
                    <td className="p-3.5 font-mono font-bold text-white">
                      {ext.booking.bookingReference}
                    </td>
                    <td className="p-3.5">
                      <span className="font-bold text-white block">{ext.booking.customer.name}</span>
                      <span className="text-[11px] text-slate-400">{ext.booking.guestPhone}</span>
                    </td>
                    <td className="p-3.5 text-white">{ext.booking.hostel.name}</td>
                    <td className="p-3.5 text-slate-400">
                      {new Date(ext.originalCheckOut).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 font-semibold text-white">
                      {new Date(ext.newCheckOut).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 text-slate-300">
                      <span className="font-semibold text-indigo-300">+{daysExtended} days</span>
                    </td>
                    <td className="p-3.5 font-black text-white">
                      ₹{ext.additionalAmount.toLocaleString()}
                    </td>
                    <td className="p-3.5">
                      <Badge
                        variant={
                          ext.status === "CONFIRMED"
                            ? "available"
                            : ext.status === "REQUESTED"
                            ? "default"
                            : "danger"
                        }
                        size="sm"
                      >
                        {ext.status}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-right">
                      <Link href={`/admin/bookings?search=${ext.booking.bookingReference}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {extensions.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            No booking extensions found.
          </div>
        )}
      </div>
    </div>
  );
}
