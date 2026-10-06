"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import {
  Calendar,
  MapPin,
  QrCode,
  Printer,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Plus,
  LogOut,
  Download,
  CreditCard,
} from "lucide-react";

interface CustomerDashboardClientProps {
  user: any;
  initialBookings: any[];
  initialTickets: any[];
  hostels: any[];
}

function isLongStayBooking(booking: any) {
  const nights = Math.ceil(
    (new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  return nights >= 28;
}

export const CustomerDashboardClient: React.FC<CustomerDashboardClientProps> = ({
  user,
  initialBookings,
  initialTickets,
  hostels,
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"bookings" | "support" | "profile">("bookings");
  const [bookings, setBookings] = useState(initialBookings);
  const [tickets, setTickets] = useState(initialTickets);

  // Selected Booking for QR Modal
  const [qrModalBooking, setQrModalBooking] = useState<any | null>(null);

  // Selected Booking for Cancellation Modal
  const [cancelModalBooking, setCancelModalBooking] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelMsg, setCancelMsg] = useState("");

  const [extendModalBooking, setExtendModalBooking] = useState<any | null>(null);
  const [extendDate, setExtendDate] = useState("");
  const [isExtending, setIsExtending] = useState(false);
  const [extendMsg, setExtendMsg] = useState("");

  const [paymentModalBooking, setPaymentModalBooking] = useState<any | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentMsg, setPaymentMsg] = useState("");

  // New Support Ticket Modal
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [ticketHostelId, setTicketHostelId] = useState(hostels[0]?.id || "");
  const [ticketCategory, setTicketCategory] = useState("WIFI");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDesc, setTicketDesc] = useState("");
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  // Find most recent active/upcoming confirmed booking
  const activeBooking = bookings.find(
    (b) => b.bookingStatus === "CONFIRMED" || b.bookingStatus === "CHECKED_IN"
  );

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/auth/login");
    router.refresh();
  };

  // Handle Cancellation Action
  const handleConfirmCancel = async () => {
    if (!cancelModalBooking) return;
    setIsCancelling(true);
    setCancelMsg("");

    try {
      const res = await fetch(`/api/bookings/${cancelModalBooking.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason || "Customer requested cancellation" }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Cancellation failed");
      }

      setCancelMsg(json.message);
      // Update local bookings state
      setBookings((prev) =>
        prev.map((b) =>
          b.id === cancelModalBooking.id
            ? { ...b, bookingStatus: "CANCELLED" }
            : b
        )
      );
      setTimeout(() => {
        setCancelModalBooking(null);
        setCancelMsg("");
      }, 2500);
    } catch (err: any) {
      setCancelMsg(err.message || "Error cancelling");
    } finally {
      setIsCancelling(false);
    }
  };

  const openExtendModal = (booking: any) => {
    const currentCheckOut = new Date(booking.checkOutDate);
    currentCheckOut.setDate(currentCheckOut.getDate() + 1);
    setExtendModalBooking(booking);
    setExtendDate(currentCheckOut.toISOString().slice(0, 10));
    setExtendMsg("");
  };

  const handleExtendBooking = async () => {
    if (!extendModalBooking || !extendDate) return;
    setIsExtending(true);
    setExtendMsg("");

    try {
      const res = await fetch(`/api/bookings/${extendModalBooking.id}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkOutDate: extendDate }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Unable to extend stay");
      }

      setBookings((previous) =>
        previous.map((booking) =>
          booking.id === extendModalBooking.id
            ? { ...booking, ...json.data.booking }
            : booking
        )
      );
      setExtendMsg(json.message);
      setTimeout(() => {
        setExtendModalBooking(null);
        setExtendMsg("");
      }, 2200);
    } catch (error: any) {
      setExtendMsg(error.message || "Unable to extend stay");
    } finally {
      setIsExtending(false);
    }
  };

  const handlePayNow = async (booking: any) => {
    if (!booking || booking.balanceAmount <= 0) return;
    setPaymentModalBooking(booking);
    setPaymentMsg("");
  };

  const processPayment = async () => {
    if (!paymentModalBooking) return;
    setIsProcessingPayment(true);
    setPaymentMsg("");

    try {
      // Create order via API
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: paymentModalBooking.id,
          amount: paymentModalBooking.balanceAmount,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to initiate payment");
      }

      // Load Razorpay script
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;

      script.onload = () => {
        const options = {
          key: json.data.key_id,
          amount: json.data.amount,
          currency: "INR",
          order_id: json.data.orderId,
          customer_notification: 1,
          handler: async (response: any) => {
            try {
              // Verify payment
              const verifyRes = await fetch("/api/payments/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orderId: json.data.orderId,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                  bookingId: paymentModalBooking.id,
                }),
              });

              const verifyJson = await verifyRes.json();
              if (!verifyRes.ok || !verifyJson.success) {
                throw new Error(verifyJson.message || "Payment verification failed");
              }

              setPaymentMsg("✓ Payment successful! Thank you.");
              // Update booking
              setBookings((prev) =>
                prev.map((b) =>
                  b.id === paymentModalBooking.id
                    ? { ...b, paidAmount: b.totalAmount, balanceAmount: 0 }
                    : b
                )
              );
              setTimeout(() => {
                setPaymentModalBooking(null);
                setPaymentMsg("");
              }, 2000);
            } catch (err: any) {
              setPaymentMsg(err.message || "Payment verification failed");
            }
          },
          prefill: {
            name: user.name,
            email: user.email,
            contact: user.phone,
          },
        };

        const razorpay = new (window as any).Razorpay(options);
        razorpay.open();
      };

      document.body.appendChild(script);
    } catch (error: any) {
      setPaymentMsg(error.message || "Failed to process payment");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Handle Submit Support Ticket
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingTicket(true);

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostelId: ticketHostelId,
          category: ticketCategory,
          subject: ticketSubject,
          description: ticketDesc,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to submit ticket");
      }

      setTickets([json.data, ...tickets]);
      setShowNewTicketModal(false);
      setTicketSubject("");
      setTicketDesc("");
      setActiveTab("support");
    } catch (err: any) {
      alert(err.message || "Failed to submit ticket");
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-[#111827] flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">
            Resident Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Welcome back, {user.name.split(" ")[0]}! 👋
          </h1>
          <p className="text-xs text-slate-400">
            Manage your hostel stays, check-in QR codes, tax invoices, and support requests.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/hostels">
            <Button variant="glow" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Book Another Stay
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            leftIcon={<LogOut className="w-4 h-4" />}
          >
            Sign Out
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("bookings")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "bookings"
              ? "bg-indigo-600 text-white shadow-glow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          My Stays & Bookings ({bookings.length})
        </button>
        <button
          onClick={() => setActiveTab("support")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "support"
              ? "bg-indigo-600 text-white shadow-glow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Support & Complaints ({tickets.length})
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "profile"
              ? "bg-indigo-600 text-white shadow-glow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Profile & ID
        </button>
      </div>

      {/* TAB 1: BOOKINGS */}
      {activeTab === "bookings" && (
        <div className="space-y-8">
          {/* Active Highlight Card if Confirmed */}
          {activeBooking && (
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-500/40 bg-[#101626]/90 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="available" size="sm">
                      {activeBooking.bookingStatus}
                    </Badge>
                    <span className="text-xs text-indigo-400 font-mono font-bold">
                      #{activeBooking.bookingReference}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-white">
                    {activeBooking.hostel.name}
                  </h2>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                    {activeBooking.hostel.address}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="glow"
                    size="sm"
                    onClick={() => setQrModalBooking(activeBooking)}
                    leftIcon={<QrCode className="w-4 h-4" />}
                  >
                    View QR Pass
                  </Button>
                  <Link href={`/confirmation?bookingRef=${activeBooking.bookingReference}`}>
                    <Button variant="outline" size="sm" leftIcon={<Printer className="w-4 h-4" />}>
                      Invoice
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openExtendModal(activeBooking)}
                    leftIcon={<Calendar className="w-4 h-4" />}
                  >
                    Extend Stay
                  </Button>
                  {isLongStayBooking(activeBooking) ? (
                    <span className="text-[11px] text-amber-300 border border-amber-500/40 rounded-lg px-2.5 py-2">
                      1-month notice • Admin cancellation
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-rose-500/50 text-rose-400 hover:border-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                      onClick={() => setCancelModalBooking(activeBooking)}
                    >
                      Cancel Stay
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block">Check-In</span>
                  <span className="font-bold text-white">
                    {new Date(activeBooking.checkInDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Check-Out</span>
                  <span className="font-bold text-white">
                    {new Date(activeBooking.checkOutDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Room / Bed</span>
                  <span className="font-bold text-indigo-400">
                    Room {activeBooking.room.roomNumber} ({activeBooking.bed.bedNumber})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Amount</span>
                  <span className="font-black text-white text-sm">
                    ₹{activeBooking.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Payment Status Card */}
              <div className={`p-4 rounded-2xl border ${
                activeBooking.balanceAmount > 0
                  ? "bg-amber-950/40 border-amber-500/40"
                  : "bg-emerald-950/40 border-emerald-500/40"
              }`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className={`text-xs font-bold uppercase tracking-wider ${
                      activeBooking.balanceAmount > 0
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }`}>
                      {activeBooking.balanceAmount > 0 ? "⚠️ Payment Pending" : "✓ Payment Complete"}
                    </p>
                    <p className="text-sm">
                      <span className="text-slate-300">Paid:</span>
                      <span className="font-bold text-white ml-2">₹{activeBooking.paidAmount.toLocaleString()}</span>
                    </p>
                  </div>
                  {activeBooking.balanceAmount > 0 && (
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-amber-300 mb-1">Balance Due</p>
                        <p className="font-black text-amber-300 text-lg">
                          ₹{activeBooking.balanceAmount.toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="glow"
                        size="sm"
                        onClick={() => handlePayNow(activeBooking)}
                        leftIcon={<CreditCard className="w-4 h-4" />}
                      >
                        Pay Now
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* All Bookings Table / List */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-[#111827]/80 space-y-4">
            <h3 className="text-lg font-bold text-white">All Reservations</h3>

            {bookings.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <Calendar className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-sm">You have no reservations yet.</p>
                <Link href="/hostels">
                  <Button variant="glow" size="sm">
                    Find A Bed
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {bookings.map((b) => (
                  <div
                    key={b.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-white">
                          {b.bookingReference}
                        </span>
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
                      </div>
                      <h4 className="text-sm font-semibold text-slate-200">
                        {b.hostel.name} • Room {b.room.roomNumber} ({b.bed.bedNumber})
                      </h4>
                      <p className="text-xs text-slate-400">
                        {new Date(b.checkInDate).toLocaleDateString()} to{" "}
                        {new Date(b.checkOutDate).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-white">
                        ₹{b.totalAmount.toLocaleString()}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQrModalBooking(b)}
                      >
                        QR Pass
                      </Button>
                      <Link href={`/confirmation?bookingRef=${b.bookingReference}`}>
                        <Button variant="outline" size="sm">
                          View Invoice
                        </Button>
                      </Link>
                      <a href={`/api/invoices/${b.id}/pdf`} download>
                        <Button variant="outline" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />}>
                          PDF
                        </Button>
                      </a>
                      {["CONFIRMED", "CHECKED_IN"].includes(b.bookingStatus) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openExtendModal(b)}
                          leftIcon={<Calendar className="w-3.5 h-3.5" />}
                        >
                          Extend
                        </Button>
                      )}
                      {b.bookingStatus === "CONFIRMED" && !isLongStayBooking(b) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-rose-500/50 text-rose-400 hover:border-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                          onClick={() => setCancelModalBooking(b)}
                        >
                          Cancel
                        </Button>
                      )}
                      {b.bookingStatus === "CONFIRMED" && isLongStayBooking(b) && (
                        <span className="text-[11px] text-amber-300 border border-amber-500/40 rounded-lg px-2 py-1.5">
                          Admin cancellation
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SUPPORT & COMPLAINTS */}
      {activeTab === "support" && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-[#111827]/80 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">
                Resident Support & Maintenance
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Raise requests for Wi-Fi, room cleaning, pod maintenance, or feedback.
              </p>
            </div>
            <Button
              variant="glow"
              size="sm"
              onClick={() => setShowNewTicketModal(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Raise Ticket
            </Button>
          </div>

          {tickets.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <HelpCircle className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm">You have no open support tickets.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-400">
                        {t.ticketNumber}
                      </span>
                      <Badge variant="default" size="sm">
                        {t.category}
                      </Badge>
                      <Badge
                        variant={
                          t.status === "RESOLVED"
                            ? "available"
                            : t.status === "OPEN"
                            ? "warning"
                            : "indigo"
                        }
                        size="sm"
                      >
                        {t.status}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-white">{t.subject}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {t.description}
                  </p>

                  {t.staffReply && (
                    <div className="p-3.5 rounded-xl bg-indigo-950/50 border border-indigo-500/30 text-xs text-indigo-200 mt-2">
                      <span className="font-bold block text-white mb-1">
                        Staff Reply:
                      </span>
                      {t.staffReply}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PROFILE */}
      {activeTab === "profile" && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-[#111827]/80 space-y-6 max-w-2xl">
          <h3 className="text-xl font-bold text-white">Resident Identity Profile</h3>
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                disabled
                value={user.name}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-semibold"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-400 mb-1">Gender</label>
                <input
                  type="text"
                  disabled
                  value={user.gender ? user.gender.charAt(0) + user.gender.slice(1).toLowerCase() : "Not specified"}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Date of Birth</label>
                <input
                  type="text"
                  disabled
                  value={user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString("en-IN") : "Not specified"}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-semibold"
                />
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-400 mb-1">Email</label>
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-semibold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-400 mb-1">Mobile</label>
              <input
                type="tel"
                disabled
                value={user.phone || "+91 98765 43210"}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-semibold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-400 mb-1">Government ID Type</label>
              <input
                type="text"
                disabled
                value={user.govtIdType || "Not specified"}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-semibold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-400 mb-1">Government ID Number</label>
              <input
                type="text"
                disabled
                value={user.govtIdNumber || "Verified at check-in (Aadhaar/Passport)"}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-semibold"
              />
            </div>
          </div>
        </div>
      )}

      {/* QR Code Pass Modal */}
      {qrModalBooking && (
        <Modal
          isOpen={!!qrModalBooking}
          onClose={() => setQrModalBooking(null)}
          title="Reception Check-In Pass"
          description={`Booking Reference: ${qrModalBooking.bookingReference}`}
        >
          <div className="flex flex-col items-center text-center space-y-4 py-4">
            {qrModalBooking.qrCodeData ? (
              <div className="p-4 bg-white rounded-2xl shadow-lg">
                <img
                  src={qrModalBooking.qrCodeData}
                  alt="QR Pass"
                  className="w-56 h-56 object-contain"
                />
              </div>
            ) : (
              <div className="w-56 h-56 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500">
                QR Not Generated
              </div>
            )}

            <div className="space-y-1">
              <span className="font-extrabold text-base text-white block">
                {qrModalBooking.hostel.name}
              </span>
              <span className="text-xs text-indigo-400 font-semibold block">
                Room {qrModalBooking.room.roomNumber} • {qrModalBooking.bed.bedNumber}
              </span>
              <p className="text-xs text-slate-400 max-w-xs mt-2">
                Present this screen to the reception desk upon arrival for instant keycard provisioning.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Extend Stay Modal */}
      {extendModalBooking && (
        <Modal
          isOpen={!!extendModalBooking}
          onClose={() => !isExtending && setExtendModalBooking(null)}
          title="Extend Your Stay"
          description={`Booking #${extendModalBooking.bookingReference}`}
        >
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Current checkout:</span>
                <span className="font-bold text-white">
                  {new Date(extendModalBooking.checkOutDate).toLocaleDateString("en-IN")}
                </span>
              </div>
              <p className="text-slate-300">
                Your existing bed will be checked for availability through the new date. The extension uses demo payment and updates your invoice immediately.
              </p>
            </div>

            <div>
              <label htmlFor="extend-checkout-date" className="block text-xs font-bold text-indigo-400 mb-1">
                New checkout date
              </label>
              <input
                id="extend-checkout-date"
                type="date"
                min={new Date(new Date(extendModalBooking.checkOutDate).getTime() + 86400000).toISOString().slice(0, 10)}
                value={extendDate}
                onChange={(event) => setExtendDate(event.target.value)}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {extendMsg && (
              <div className="p-3 rounded-xl bg-indigo-950 border border-indigo-500 text-xs text-indigo-300">
                {extendMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExtendModalBooking(null)}
                disabled={isExtending}
              >
                Cancel
              </Button>
              <Button
                variant="glow"
                size="sm"
                isLoading={isExtending}
                onClick={handleExtendBooking}
                disabled={!extendDate}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Confirm Extension
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancellation Modal */}
      {cancelModalBooking && (
        <Modal
          isOpen={!!cancelModalBooking}
          onClose={() => !isCancelling && setCancelModalBooking(null)}
          title="Cancel Reservation"
          description={`Booking #${cancelModalBooking.bookingReference}`}
        >
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-2">
              <span className="font-bold text-white block">
                Cancellation & Refund Policy:
              </span>
              <p className="text-slate-300">
                • More than 7 days before check-in: <strong>100% refund</strong>
              </p>
              <p className="text-slate-300">
                • 3 to 7 days before check-in: <strong>50% refund</strong>
              </p>
              <p className="text-slate-300">
                • Less than 3 days: <strong>Non-refundable</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Reason for Cancellation
              </label>
              <textarea
                rows={2}
                placeholder="Let us know why you need to cancel..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            {cancelMsg && (
              <div className="p-3 rounded-xl bg-indigo-950 border border-indigo-500 text-xs text-indigo-300">
                {cancelMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCancelModalBooking(null)}
                disabled={isCancelling}
              >
                Keep Booking
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={isCancelling}
                onClick={handleConfirmCancel}
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* New Support Ticket Modal */}
      {showNewTicketModal && (
        <Modal
          isOpen={showNewTicketModal}
          onClose={() => setShowNewTicketModal(false)}
          title="Raise Support Request"
          description="Direct line to hostel management & operations team"
        >
          <form onSubmit={handleSubmitTicket} className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                Hostel Property
              </label>
              <select
                value={ticketHostelId}
                onChange={(e) => setTicketHostelId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none"
              >
                {hostels.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                Category
              </label>
              <select
                value={ticketCategory}
                onChange={(e) => setTicketCategory(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none"
              >
                <option value="WIFI">Wi-Fi & Internet</option>
                <option value="CLEANING">Housekeeping & Linen</option>
                <option value="ROOM">Room / Bed Pod</option>
                <option value="MAINTENANCE">Air Conditioning / Electric</option>
                <option value="NOISE">Noise & Quiet Hours</option>
                <option value="PAYMENT">Payment & Deposit</option>
                <option value="OTHER">General Query</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                Subject
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Wi-Fi signal weak in Room 204 pod B"
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                required
                placeholder="Provide detailed description..."
                value={ticketDesc}
                onChange={(e) => setTicketDesc(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setShowNewTicketModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="glow"
                size="sm"
                type="submit"
                isLoading={isSubmittingTicket}
              >
                Submit Ticket
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Payment Modal */}
      {paymentModalBooking && (
        <Modal
          isOpen={!!paymentModalBooking}
          onClose={() => !isProcessingPayment && setPaymentModalBooking(null)}
          title="Pay Remaining Balance"
          description={`Booking #${paymentModalBooking.bookingReference}`}
        >
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Hostel:</span>
                <span className="font-bold text-white">{paymentModalBooking.hostel.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Room & Bed:</span>
                <span className="font-bold text-indigo-400">
                  Room {paymentModalBooking.room.roomNumber} • {paymentModalBooking.bed.bedNumber}
                </span>
              </div>
              <div className="border-t border-slate-800 pt-3">
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Total Amount:</span>
                  <span className="font-bold text-white">
                    ₹{paymentModalBooking.totalAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Already Paid:</span>
                  <span className="font-bold text-emerald-400">
                    ₹{paymentModalBooking.paidAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-700 pt-2 mt-2">
                  <span className="text-amber-300 font-bold">Balance Due:</span>
                  <span className="font-black text-amber-300 text-lg">
                    ₹{paymentModalBooking.balanceAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30 text-xs text-blue-200">
              <p className="font-bold mb-1">💳 Secure Payment</p>
              <p>
                Your payment will be processed securely through Razorpay. This payment is required to confirm your booking extension.
              </p>
            </div>

            {paymentMsg && (
              <div className={`p-3 rounded-xl text-xs ${
                paymentMsg.includes("✓")
                  ? "bg-emerald-950 border border-emerald-500 text-emerald-300"
                  : "bg-red-950 border border-red-500 text-red-300"
              }`}>
                {paymentMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPaymentModalBooking(null)}
                disabled={isProcessingPayment}
              >
                Cancel
              </Button>
              <Button
                variant="glow"
                size="sm"
                isLoading={isProcessingPayment}
                onClick={processPayment}
                leftIcon={<CreditCard className="w-4 h-4" />}
              >
                Pay ₹{paymentModalBooking.balanceAmount.toLocaleString()}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CustomerDashboardClient;
