"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import CustomSelect from "@/components/ui/CustomSelect";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import DatePicker from "@/components/ui/DatePicker";
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
  CreditCard,
  LogOut,
  Sparkles,
} from "lucide-react";

interface BookingsManagementClientProps {
  initialBookings: any[];
  hostels: any[];
  initialSearch?: string;
  canEdit?: boolean;
  hideFinancials?: boolean;
}

export const BookingsManagementClient: React.FC<BookingsManagementClientProps> = ({
  initialBookings,
  hostels,
  initialSearch = "",
  canEdit = true,
  hideFinancials = false,
}) => {
  const [bookings, setBookings] = useState(initialBookings);
  const [search, setSearch] = useState(initialSearch);
  const [selectedHostel, setSelectedHostel] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  // Offline Monthly Rent Modal State
  const [showOfflineRentModal, setShowOfflineRentModal] = useState(false);
  const [offlinePaymentMode, setOfflinePaymentMode] = useState("CASH");
  const [offlineRentAmount, setOfflineRentAmount] = useState("");
  const [offlineRentNotes, setOfflineRentNotes] = useState("");
  const [isRecordingOfflineRent, setIsRecordingOfflineRent] = useState(false);
  const [offlineRentMsg, setOfflineRentMsg] = useState("");

  // Admin Notice to Vacate Modal State
  const [showAdminNoticeModal, setShowAdminNoticeModal] = useState(false);
  const [adminNoticeDate, setAdminNoticeDate] = useState("");
  const [adminNoticeReason, setAdminNoticeReason] = useState("");
  const [isAdminSubmittingNotice, setIsAdminSubmittingNotice] = useState(false);
  const [adminNoticeMsg, setAdminNoticeMsg] = useState("");

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

  const handleRecordOfflineRent = async () => {
    if (!selectedBooking) return;
    setIsRecordingOfflineRent(true);
    setOfflineRentMsg("");

    try {
      const res = await fetch(`/api/bookings/${selectedBooking.id}/monthly-rent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "OFFLINE",
          paymentMode: offlinePaymentMode,
          amount: Number(offlineRentAmount) || undefined,
          notes: offlineRentNotes,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to record rent payment");
      }

      setOfflineRentMsg(json.message);
      const updated = json.data?.updatedBooking || json.data;
      if (updated) {
        setBookings((prev) =>
          prev.map((b) => (b.id === selectedBooking.id ? { ...b, ...updated } : b))
        );
        setSelectedBooking((prev: any) => ({ ...prev, ...updated }));
      }

      setTimeout(() => {
        setShowOfflineRentModal(false);
        setOfflineRentMsg("");
      }, 2000);
    } catch (err: any) {
      setOfflineRentMsg(err.message || "Failed to record rent payment");
    } finally {
      setIsRecordingOfflineRent(false);
    }
  };

  const handleAdminSubmitNotice = async () => {
    if (!selectedBooking || !adminNoticeDate) return;
    setIsAdminSubmittingNotice(true);
    setAdminNoticeMsg("");

    try {
      const res = await fetch(`/api/bookings/${selectedBooking.id}/vacate-notice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMIT",
          vacateDate: adminNoticeDate,
          reason: adminNoticeReason || "Notice recorded by front desk",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to record vacating notice");
      }

      setAdminNoticeMsg(json.message);
      const updated = json.data?.booking;
      if (updated) {
        setBookings((prev) =>
          prev.map((b) => (b.id === selectedBooking.id ? { ...b, ...updated } : b))
        );
        setSelectedBooking((prev: any) => ({ ...prev, ...updated }));
      }

      setTimeout(() => {
        setShowAdminNoticeModal(false);
        setAdminNoticeMsg("");
      }, 2000);
    } catch (err: any) {
      setAdminNoticeMsg(err.message || "Failed to record notice");
    } finally {
      setIsAdminSubmittingNotice(false);
    }
  };

  const handleAdminWithdrawNotice = async () => {
    if (!selectedBooking) return;
    if (
      !confirm(
        "Are you sure you want to cancel the vacating notice and restore this resident to ongoing month-to-month status?"
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/bookings/${selectedBooking.id}/vacate-notice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "WITHDRAW" }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to withdraw vacating notice");
      }

      const updated = json.data?.booking;
      if (updated) {
        setBookings((prev) =>
          prev.map((b) => (b.id === selectedBooking.id ? { ...b, ...updated } : b))
        );
        setSelectedBooking((prev: any) => ({ ...prev, ...updated }));
      }
      alert(json.message || "Vacating notice cancelled. Month-to-month restored.");
    } catch (err: any) {
      alert(err.message || "Failed to cancel notice");
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
          <CustomSelect value={selectedHostel} onValueChange={setSelectedHostel} options={[{ value: "all", label: "All Properties" }, ...hostels.map((h) => ({ value: h.id, label: h.name }))]} triggerClassName="min-w-44 p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs" />

          <CustomSelect value={statusFilter} onValueChange={setStatusFilter} options={[{ value: "all", label: "All Statuses" }, { value: "CONFIRMED", label: "Confirmed" }, { value: "CHECKED_IN", label: "Checked In" }, { value: "CHECKED_OUT", label: "Checked Out" }, { value: "CANCELLED", label: "Cancelled" }, { value: "PAYMENT_PENDING", label: "Payment Pending" }]} triggerClassName="min-w-44 p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs" />
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
                      {hideFinancials ? (
                        <span className="font-mono text-slate-500 font-bold text-xs" title="Financial figures restricted for your role">
                          ••••••
                        </span>
                      ) : (
                        `₹${b.totalAmount.toLocaleString()}`
                      )}
                    </td>
                    <td className="p-3.5 space-y-1">
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
                      {b.stayType === "MONTHLY" && (
                        <div>
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              b.isOpenEnded
                                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {b.isOpenEnded ? "Monthly Resident" : "Notice Active"}
                          </span>
                        </div>
                      )}
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

            {/* Monthly Resident Controls Card for Staff */}
            {selectedBooking.stayType === "MONTHLY" && (
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                    🏢 Monthly Coliving Agreement
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      selectedBooking.isOpenEnded
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    }`}
                  >
                    {selectedBooking.isOpenEnded ? "Auto-Renewing Indefinite" : "Vacating Notice Active"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-slate-300">
                  <div>
                    <span className="text-slate-500 block">Current Paid Term Ends:</span>
                    <span className="font-bold text-white">
                      {new Date(selectedBooking.checkOutDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Scheduled Checkout:</span>
                    <span className="font-bold text-indigo-200">
                      {selectedBooking.isOpenEnded
                        ? "Ongoing Month-to-Month"
                        : new Date(selectedBooking.checkOutDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {canEdit && (
                  <div className="pt-2 border-t border-indigo-500/20 flex flex-wrap items-center gap-2">
                    <Button
                      variant="glow"
                      size="sm"
                      onClick={() => {
                        setOfflineRentAmount(
                          String(selectedBooking.baseAmount + (selectedBooking.serviceFee || selectedBooking.room?.roomType?.maintenanceFee || 2000))
                        );
                        setShowOfflineRentModal(true);
                        setOfflineRentMsg("");
                      }}
                      leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                    >
                      Record Offline Monthly Rent
                    </Button>

                    {selectedBooking.isOpenEnded ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-amber-500/50 text-amber-300 hover:border-amber-400 hover:bg-amber-500/10"
                        onClick={() => {
                          const minDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                            .toISOString()
                            .slice(0, 10);
                          setAdminNoticeDate(minDate);
                          setShowAdminNoticeModal(true);
                          setAdminNoticeMsg("");
                        }}
                        leftIcon={<LogOut className="w-3.5 h-3.5" />}
                      >
                        Set Vacating Notice
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-emerald-500/50 text-emerald-300 hover:border-emerald-400 hover:bg-emerald-500/10"
                        onClick={handleAdminWithdrawNotice}
                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      >
                        Cancel Notice (Restore Resident)
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Price breakdown */}
            {hideFinancials ? (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  Financial figures and billing breakdowns are masked for your role credentials.
                </span>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5 text-xs text-slate-300">
                <span className="font-bold text-white block mb-2">Financial Breakdown:</span>
                <div className="flex justify-between">
                  <span>Base Rate:</span>
                  <span className="font-semibold text-white">
                    ₹{selectedBooking.baseAmount.toLocaleString()}
                  </span>
                </div>
                {selectedBooking.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span>GST:</span>
                    <span className="font-semibold text-white">
                      ₹{selectedBooking.taxAmount.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>{selectedBooking.stayType === "MONTHLY" ? "Maintenance Fee:" : "Service Fee:"}</span>
                  <span className="font-semibold text-white">
                    ₹{selectedBooking.serviceFee.toLocaleString()}
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
            )}

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
                      <span className="font-semibold text-indigo-300">
                        {hideFinancials ? "••••••" : `₹${ext.additionalAmount.toLocaleString()}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <div>
                {canEdit && selectedBooking.bookingStatus === "CONFIRMED" && (
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
                {!hideFinancials && (
                  <Link href={`/confirmation?bookingRef=${selectedBooking.bookingReference}`}>
                    <Button variant="outline" size="sm" leftIcon={<Printer className="w-4 h-4" />}>
                      Tax Invoice
                    </Button>
                  </Link>
                )}
                <Button variant="ghost" size="sm" onClick={() => setSelectedBooking(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Record Offline Rent Modal */}
      {showOfflineRentModal && selectedBooking && (
        <Modal
          isOpen={showOfflineRentModal}
          onClose={() => !isRecordingOfflineRent && setShowOfflineRentModal(false)}
          title="Record Offline Monthly Rent"
          description={`Booking #${selectedBooking.bookingReference} — ${selectedBooking.guestName}`}
        >
          <div className="space-y-4 py-2 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Resident:</span>
                <span className="font-bold text-white">{selectedBooking.guestName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current checkout:</span>
                <span className="font-bold text-white">
                  {new Date(selectedBooking.checkOutDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800 text-indigo-300">
                <span>New checkout after renewal:</span>
                <span className="font-bold">
                  {new Date(
                    new Date(selectedBooking.checkOutDate).getTime() + 30 * 24 * 60 * 60 * 1000
                  ).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-indigo-400 mb-1">Payment Method</label>
              <CustomSelect
                value={offlinePaymentMode}
                onValueChange={setOfflinePaymentMode}
                options={[
                  { value: "CASH", label: "Cash (Collected at Reception)" },
                  { value: "UPI", label: "Hostel Counter UPI QR" },
                  { value: "CARD", label: "Card Swipe (POS Terminal)" },
                  { value: "BANK_TRANSFER", label: "Direct Bank Transfer (NEFT/IMPS)" },
                ]}
                triggerClassName="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-indigo-400 mb-1">
                Amount Collected (₹)
              </label>
              <input
                type="number"
                value={offlineRentAmount}
                onChange={(e) => setOfflineRentAmount(e.target.value)}
                placeholder="Rent Amount"
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Staff Notes / Reference (Optional)
              </label>
              <textarea
                rows={2}
                value={offlineRentNotes}
                onChange={(e) => setOfflineRentNotes(e.target.value)}
                placeholder="e.g. Receipt #1042 issued, collected by Rajesh"
                className="w-full p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {offlineRentMsg && (
              <div
                className={`p-3 rounded-xl text-xs ${
                  offlineRentMsg.includes("recorded") || offlineRentMsg.includes("extended")
                    ? "bg-emerald-950 border border-emerald-500 text-emerald-300"
                    : "bg-rose-950 border border-rose-500 text-rose-300"
                }`}
              >
                {offlineRentMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOfflineRentModal(false)}
                disabled={isRecordingOfflineRent}
              >
                Cancel
              </Button>
              <Button
                variant="glow"
                size="sm"
                isLoading={isRecordingOfflineRent}
                onClick={handleRecordOfflineRent}
                leftIcon={<CreditCard className="w-4 h-4" />}
              >
                Confirm & Extend Stay
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Admin Set Vacating Notice Modal */}
      {showAdminNoticeModal && selectedBooking && (
        <Modal
          isOpen={showAdminNoticeModal}
          onClose={() => !isAdminSubmittingNotice && setShowAdminNoticeModal(false)}
          title="Set Resident Vacating Notice"
          description={`Booking #${selectedBooking.bookingReference} — ${selectedBooking.guestName}`}
        >
          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-slate-300 space-y-1">
              <p className="font-bold text-amber-300">Staff Notice Entry</p>
              <p>
                Setting a vacating notice fixes the checkout date and unlocks this bed for online
                reservations starting after the departure date.
              </p>
            </div>

            <div>
              <label htmlFor="admin-vacating-departure-date" className="block text-xs font-bold text-indigo-400 mb-1">
                Scheduled Departure Date
              </label>
              <DatePicker
                value={adminNoticeDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={setAdminNoticeDate}
                triggerClassName="min-h-12 rounded-xl border border-slate-700 bg-slate-900 p-3"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Reason / Note (Optional)
              </label>
              <textarea
                rows={2}
                value={adminNoticeReason}
                onChange={(e) => setAdminNoticeReason(e.target.value)}
                placeholder="e.g. Resident informed front desk verbally / via WhatsApp"
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {adminNoticeMsg && (
              <div
                className={`p-3 rounded-xl text-xs ${
                  adminNoticeMsg.includes("recorded")
                    ? "bg-emerald-950 border border-emerald-500 text-emerald-300"
                    : "bg-rose-950 border border-rose-500 text-rose-300"
                }`}
              >
                {adminNoticeMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdminNoticeModal(false)}
                disabled={isAdminSubmittingNotice}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={isAdminSubmittingNotice}
                onClick={handleAdminSubmitNotice}
                disabled={!adminNoticeDate}
                leftIcon={<LogOut className="w-4 h-4" />}
              >
                Record Notice
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default BookingsManagementClient;
