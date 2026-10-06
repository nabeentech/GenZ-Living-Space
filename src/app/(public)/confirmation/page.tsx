import React from "react";
import Link from "next/link";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import prisma from "@/lib/prisma";
import { generateBookingQRCode } from "@/lib/qr";
import {
  CheckCircle,
  MapPin,
  Calendar,
  Bed as BedIcon,
  Printer,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Phone,
  User,
} from "lucide-react";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

interface ConfirmationPageProps {
  searchParams: {
    bookingRef?: string;
    bookingId?: string;
  };
}

export default async function ConfirmationPage({
  searchParams,
}: ConfirmationPageProps) {
  const { bookingRef, bookingId } = searchParams;

  const booking = await prisma.booking.findFirst({
    where: {
      OR: [
        ...(bookingRef ? [{ bookingReference: bookingRef }] : []),
        ...(bookingId ? [{ id: bookingId }] : []),
      ],
    },
    include: {
      hostel: true,
      room: { include: { roomType: true } },
      bed: true,
      payments: true,
      invoices: true,
    },
  });

  if (!booking) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-2xl font-bold mb-2">Booking Not Found</h2>
          <p className="text-slate-400 mb-6 text-sm">
            We couldn't locate this reservation. Please check your confirmation link or log in to your dashboard.
          </p>
          <Link href="/dashboard">
            <Button variant="glow">Go to My Dashboard</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const invoice = booking.invoices[0];
  const qrCodeData = booking.qrCodeData?.startsWith("data:image/")
    ? booking.qrCodeData
    : await generateBookingQRCode(booking.bookingReference, booking.id);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 py-12 lg:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Celebration Card */}
          <div className="glass-panel p-8 rounded-3xl border border-emerald-500/40 bg-[#101626]/90 text-center space-y-4 shadow-2xl mb-8">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-glow">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3.5 py-1 rounded-full">
                Payment Received & Confirmed
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-white mt-3">
                Booking Confirmed! You're All Set.
              </h1>
              <p className="text-slate-300 text-sm mt-1">
                Booking Reference:{" "}
                <span className="font-mono text-indigo-400 font-bold text-base">
                  {booking.bookingReference}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <PrintButton bookingId={booking.id} />
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  View in My Dashboard
                </Button>
              </Link>
            </div>
          </div>

          {/* Printable Ticket Pass & QR Section */}
          <div
            id="printable-ticket"
            className="glass-panel p-8 sm:p-10 rounded-3xl border border-slate-800 bg-[#111827] shadow-2xl space-y-8"
          >
            {/* Top Brand Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <span className="text-xl font-black text-white">
                  GenZ <span className="text-indigo-400">Living Space</span>
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Official Stay Confirmation & Check-In Pass
                </p>
              </div>

              <div className="sm:text-right">
                <span className="text-xs text-slate-400 block">Invoice Number</span>
                <span className="font-mono text-sm font-bold text-white">
                  {invoice?.invoiceNumber || "GZ-INV-PENDING"}
                </span>
              </div>
            </div>

            {/* Main Pass Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Details (2 Cols) */}
              <div className="md:col-span-2 space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {booking.hostel.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>{booking.hostel.address}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-900/70 border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Check-In</span>
                    <span className="font-bold text-white text-sm">
                      {new Date(booking.checkInDate).toLocaleDateString("en-IN", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-slate-500 block mt-0.5">
                      After {booking.hostel.checkInTime}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Check-Out</span>
                    <span className="font-bold text-white text-sm">
                      {new Date(booking.checkOutDate).toLocaleDateString("en-IN", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-slate-500 block mt-0.5">
                      Before {booking.hostel.checkOutTime}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">
                      Room & Bunk
                    </span>
                    <span className="font-bold text-white text-sm">
                      Room {booking.room.roomNumber} ({booking.bed.bedNumber})
                    </span>
                    <span className="text-indigo-400 block text-[11px]">
                      {booking.room.roomType.name}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">
                      Primary Resident
                    </span>
                    <span className="font-bold text-white text-sm">
                      {booking.guestName}
                    </span>
                    <span className="text-slate-400 block text-[11px]">
                      {booking.guestPhone}
                    </span>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="pt-4 border-t border-slate-800 space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span>Base Accommodation Rate</span>
                    <span className="font-semibold text-white">
                      ₹{booking.baseAmount.toLocaleString()}
                    </span>
                  </div>
                  {booking.discountAmount > 0 && (
                    <div className="flex justify-between text-pink-400">
                      <span>Discount ({booking.couponCode})</span>
                      <span>-₹{booking.discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Hospitality GST (12%)</span>
                    <span className="font-semibold text-white">
                      ₹{booking.taxAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Service Fee</span>
                    <span className="font-semibold text-white">
                      ₹{booking.serviceFee}
                    </span>
                  </div>
                  {booking.securityDeposit > 0 && (
                    <div className="flex justify-between text-amber-300">
                      <span>Refundable Security Deposit</span>
                      <span>₹{booking.securityDeposit.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-bold text-white">
                    <span>Total Paid (PAID IN FULL)</span>
                    <span className="text-lg font-black text-emerald-400">
                      ₹{booking.paidAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* QR Code Pass (1 Col) */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-center space-y-4">
                <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
                  Reception QR Scanner Pass
                </span>

                {qrCodeData ? (
                  <div className="p-3 bg-white rounded-2xl shadow-md">
                    <img
                      src={qrCodeData}
                      alt="Booking QR Code"
                      className="w-44 h-44 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-44 h-44 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 text-xs">
                    QR Generated
                  </div>
                )}

                <div className="space-y-1 text-xs">
                  <span className="font-mono font-bold text-white block">
                    {booking.bookingReference}
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Present this QR code to the reception desk for instant check-in.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Notice */}
            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 text-xs text-slate-300 space-y-1">
              <span className="font-bold text-white block">Important Instructions:</span>
              <p>
                • Please bring the original government ID matching your reservation name.
              </p>
              <p>
                • High-speed Wi-Fi password and digital room keycard will be provided upon arrival.
              </p>
              <p>
                • For urgent assistance, contact central desk: {booking.hostel.contactPhone}.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
