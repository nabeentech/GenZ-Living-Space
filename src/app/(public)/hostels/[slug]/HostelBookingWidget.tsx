"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Users, ShieldCheck, Sparkles, ArrowRight, Tag } from "lucide-react";
import Button from "@/components/ui/Button";
import { calculateBookingPrice } from "@/lib/pricing";

interface HostelBookingWidgetProps {
  hostel: any;
  roomTypes: any[];
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: string;
}

export const HostelBookingWidget: React.FC<HostelBookingWidgetProps> = ({
  hostel,
  roomTypes,
  initialCheckIn,
  initialCheckOut,
  initialGuests,
}) => {
  const router = useRouter();

  const todayStr = new Date().toISOString().split("T")[0];
  const defaultOut = new Date();
  defaultOut.setDate(defaultOut.getDate() + 3);
  const defaultOutStr = defaultOut.toISOString().split("T")[0];

  const [checkIn, setCheckIn] = useState(initialCheckIn || todayStr);
  const [checkOut, setCheckOut] = useState(initialCheckOut || defaultOutStr);
  const [guests, setGuests] = useState(Number(initialGuests) || 1);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState(
    roomTypes[0]?.id || ""
  );

  const selectedRoomType = useMemo(
    () => roomTypes.find((r) => r.id === selectedRoomTypeId) || roomTypes[0],
    [roomTypes, selectedRoomTypeId]
  );

  // Compute live price quote
  const pricingQuote = useMemo(() => {
    if (!selectedRoomType) return null;
    const cIn = new Date(checkIn);
    const cOut = new Date(checkOut);
    if (isNaN(cIn.getTime()) || isNaN(cOut.getTime()) || cOut <= cIn) return null;

    return calculateBookingPrice({
      checkInDate: cIn,
      checkOutDate: cOut,
      basePrice: selectedRoomType.basePrice,
      weeklyDiscountPct: selectedRoomType.weeklyDiscountPct,
      monthlyPrice: selectedRoomType.monthlyPrice,
      securityDeposit: selectedRoomType.securityDeposit,
    });
  }, [selectedRoomType, checkIn, checkOut]);

  const handleProceed = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(
      `/book?hostel=${hostel.slug}&roomType=${selectedRoomTypeId}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`
    );
  };

  return (
    <form
      onSubmit={handleProceed}
      className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-500/40 bg-[#111827]/95 shadow-2xl backdrop-blur-xl space-y-6"
    >
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
        <div>
          <span className="text-[11px] text-slate-400 block uppercase font-bold tracking-wider">
            Starting rate
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-white">
              ₹{selectedRoomType ? selectedRoomType.basePrice : 599}
            </span>
            <span className="text-xs text-slate-400">/ night</span>
          </div>
        </div>
        <span className="text-xs font-bold text-pink-400 bg-pink-950/60 border border-pink-500/30 px-3 py-1 rounded-full">
          Instant Hold
        </span>
      </div>

      <div className="space-y-4">
        {/* Room Type Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1.5">
            Room / Dorm Type
          </label>
          <select
            value={selectedRoomTypeId}
            onChange={(e) => setSelectedRoomTypeId(e.target.value)}
            className="w-full p-3 rounded-xl bg-slate-900/80 border border-slate-700/80 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
          >
            {roomTypes.map((rt) => (
              <option key={rt.id} value={rt.id} className="bg-[#111827]">
                {rt.name} ({rt.genderCategory}) — ₹{rt.basePrice}/night
              </option>
            ))}
          </select>
        </div>

        {/* Date Inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Check-In
            </label>
            <input
              type="date"
              min={todayStr}
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Check-Out
            </label>
            <input
              type="date"
              min={checkIn || todayStr}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Guests */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1.5 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            Number of Guests
          </label>
          <select
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="w-full p-3 rounded-xl bg-slate-900/80 border border-slate-700/80 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n} className="bg-[#111827]">
                {n} {n === 1 ? "Guest" : "Guests"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Live Breakdown Quote */}
      {pricingQuote && (
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2.5 text-xs text-slate-300">
          <div className="flex justify-between">
            <span>
              Stay Duration ({pricingQuote.nights}{" "}
              {pricingQuote.nights === 1 ? "night" : "nights"} • {pricingQuote.stayType})
            </span>
            <span className="font-semibold text-white">
              ₹{pricingQuote.baseAmount.toLocaleString()}
            </span>
          </div>

          {pricingQuote.weeklyDiscountApplied > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>Weekly Stay Discount</span>
              <span>-₹{pricingQuote.weeklyDiscountApplied.toLocaleString()}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span>Hospitality GST (12%)</span>
            <span className="font-semibold text-white">
              ₹{pricingQuote.taxAmount.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between">
            <span>Service & Maintenance Fee</span>
            <span className="font-semibold text-white">
              ₹{pricingQuote.serviceFee}
            </span>
          </div>

          {pricingQuote.securityDeposit > 0 && (
            <div className="flex justify-between text-amber-300">
              <span>Refundable Security Deposit</span>
              <span>₹{pricingQuote.securityDeposit.toLocaleString()}</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-bold text-white">
            <span>Estimated Total</span>
            <span className="text-xl font-black text-indigo-400">
              ₹{pricingQuote.totalAmount.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      <Button
        type="submit"
        variant="glow"
        size="lg"
        className="w-full justify-center shadow-glow text-base py-3.5"
        rightIcon={<ArrowRight className="w-4 h-4" />}
      >
        Select Bed & Reserve
      </Button>

      <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>15-min price & bed hold guarantee at checkout</span>
      </div>
    </form>
  );
};

export default HostelBookingWidget;
