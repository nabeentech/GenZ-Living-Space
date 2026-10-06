"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import {
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Printer,
  QrCode,
  MapPin,
  Calendar,
  AlertCircle,
  XCircle,
} from "lucide-react";

interface BookingsManagementClientProps {
  initialBookings: any[];
  hostels: any[];
  initialSearch?: string;
}

export const BookingsManagementClient: React.FC<BookingsManagementClientProps> = ({
  initialBookings,
  hostels,
  initialSearch = "",
}) => {
  const [bookings, setBookings] = useState(initialBookings);
  const [search, setSearch] = useState(initialSearch);
  const [selectedHostel, setSelectedHostel] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchHostel =
        selectedHostel === "all" || b.hostelId === selectedHostel;
      const matchStatus =
        statusFilter === "all" || b.bookingStatus === statusFilter;
      const matchSearch =
        !search ||
        b.bookingReference.toLowerCase().includes(search.toLowerCase()) ||
        b.guestName.toLowerCase().includes(search.toLowerCase()) ||
        b.guestPhone.includes(search);
      return matchHostel && matchStatus && matchSearch;
    });
  }, [bookings, selectedHostel, statusFilter, search]);

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking and issue a policy refund?")) {
      return;
    }

    setIsCancelling(true);
    setActionMsg("");

    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Admin cancellation override" }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Cancellation failed");
      }

      setActionMsg(json.message);
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, bookingStatus: "CANCELLED" } : b
        )
      );
      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking({ ...selectedBooking, bookingStatus: "CANCELLED" });
      }
    } catch (err: any) {
      alert(err.message || "Error cancelling booking");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 bg-[#111827]/80 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search reference, guest, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filter Hostels & Status */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedHostel}
            onChange={(e) => setSelectedHostel(e.target.value)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none"
          >
            <option value="all">All 2 Properties</option>
            {hostels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CHECKED_IN">Checked In</option>
            <option value="CHECKED_OUT">Checked Out</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="PAYMENT_PENDING">Payment Pending</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-[#111827]/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3.5">Ref #</th>
                <th className="p-3.5">Guest Info</th>
                <th className="p-3.5">Hostel</th>
                <th className="p-3.5">Room & Bed</th>
                <th className="p-3.5">Stay Dates</th>
                <th className="p-3.5">Amount</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No reservations matching current criteria.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-900/50 transition">
                    <td className="p-3.5 font-mono font-bold text-white">
                      {b.bookingReference}
                    </td>
                    <td className="p-3.5">
                      <span className="font-bold text-white block">{b.guestName}</span>
                      <span className="text-[11px] text-slate-400">{b.guestPhone}</span>
                    </td>
                    <td className="p-3.5 font-semibold text-white">
                      {b.hostel.name}
                    </td>
                    <td className="p-3.5">
                      <span className="font-medium text-white block">
                        Room {b.room.roomNumber}
                      </span>
                      <span className="text-indigo-400 text-[11px]">
                        {b.bed.bedNumber}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="block text-white">
                        {new Date(b.checkInDate).toLocaleDateString()}
                      </span>
                      <span className="text-slate-400 text-[10px]">
                        to {new Date(b.checkOutDate).toLocaleDateString()}
                      </span>
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
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedBooking(b)}
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          View
                        </Button>
                        <Link href={`/confirmation?bookingRef=${b.bookingReference}`}>
                          <Button variant="ghost" size="sm">
                            Invoice
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <Modal
          isOpen={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          title={`Reservation Details — #${selectedBooking.bookingReference}`}
          description={`Created on ${new Date(selectedBooking.createdAt).toLocaleString()}`}
          maxWidth="lg"
        >
          <div className="space-y-4 py-2">
            {actionMsg && (
              <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-500 text-xs text-emerald-300">
                {actionMsg}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Guest Name</span>
                <span className="font-bold text-white text-sm">
                  {selectedBooking.guestName}
                </span>
                <span className="text-slate-400 block mt-0.5">
                  {selectedBooking.guestPhone} • {selectedBooking.guestEmail}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Gender & Age</span>
                <span className="font-bold text-white text-sm">
                  {selectedBooking.guestGender || "Not specified"}
                </span>
                <span className="text-slate-400 block mt-0.5">
                  Age: {selectedBooking.guestDateOfBirth
                    ? Math.floor((new Date().getTime() - new Date(selectedBooking.guestDateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) + " years"
                    : "Not specified"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Govt ID</span>
                <span className="font-mono text-white text-sm">
                  {selectedBooking.guestGovtId || "Presented at check-in"}
                </span>
                <span className="text-slate-400 block mt-0.5">
                  Type: {selectedBooking.guestGovtIdType || "Not specified"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Hostel & Room</span>
                <span className="font-bold text-white">
                  {selectedBooking.hostel.name}
                </span>
                <span className="text-indigo-400 block font-semibold">
                  Room {selectedBooking.room.roomNumber} • {selectedBooking.bed.bedNumber}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Stay Duration</span>
                <span className="font-bold text-white">
                  {new Date(selectedBooking.checkInDate).toLocaleDateString()} to{" "}
                  {new Date(selectedBooking.checkOutDate).toLocaleDateString()}
                </span>
                <span className="text-slate-400 block">
                  Status: {selectedBooking.bookingStatus}
                </span>
              </div>
            </div>

            {/* Price breakdown */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5 text-xs text-slate-300">
              <span className="font-bold text-white block mb-2">Financial Breakdown:</span>
              <div className="flex justify-between">
                <span>Base Rate:</span>
                <span className="font-semibold text-white">
                  ₹{selectedBooking.baseAmount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>GST (12%):</span>
                <span className="font-semibold text-white">
                  ₹{selectedBooking.taxAmount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Service Fee:</span>
                <span className="font-semibold text-white">
                  ₹{selectedBooking.serviceFee}
                </span>
              </div>
              {selectedBooking.discountAmount > 0 && (
                <div className="flex justify-between text-pink-400">
                  <span>Coupon Discount:</span>
                  <span>-₹{selectedBooking.discountAmount.toLocaleString()}</span>
                </div>
              )}
              {selectedBooking.securityDeposit > 0 && (
                <div className="flex justify-between text-amber-300">
                  <span>Security Deposit:</span>
                  <span>₹{selectedBooking.securityDeposit.toLocaleString()}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm text-white">
                <span>Total Amount:</span>
                <span className="text-emerald-400">
                  ₹{selectedBooking.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Extension History */}
            {selectedBooking.extensions && selectedBooking.extensions.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 text-xs">
                <span className="font-bold text-white block">Stay Extensions:</span>
                {selectedBooking.extensions.map((ext: any) => (
                  <div key={ext.id} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-400">
                        {new Date(ext.originalCheckOut).toLocaleDateString()} → {new Date(ext.newCheckOut).toLocaleDateString()}
                      </span>
                      <Badge
                        variant={ext.status === "CONFIRMED" ? "available" : ext.status === "REQUESTED" ? "default" : "danger"}
                        size="sm"
                      >
                        {ext.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Additional Charge:</span>
                      <span className="font-semibold text-indigo-300">₹{ext.additionalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <div>
                {selectedBooking.bookingStatus === "CONFIRMED" && (
                  <Button
                    variant="danger"
                    size="sm"
                    isLoading={isCancelling}
                    onClick={() => handleCancelBooking(selectedBooking.id)}
                  >
                    Cancel & Refund
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Link href={`/confirmation?bookingRef=${selectedBooking.bookingReference}`}>
                  <Button variant="outline" size="sm" leftIcon={<Printer className="w-4 h-4" />}>
                    Tax Invoice
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => setSelectedBooking(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default BookingsManagementClient;
