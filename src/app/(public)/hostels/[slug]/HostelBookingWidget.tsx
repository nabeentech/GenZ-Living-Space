"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Users, ShieldCheck, Sparkles, ArrowRight, Tag } from "lucide-react";
import Button from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";
import CustomSelect from "@/components/ui/CustomSelect";
import { addUtcCalendarDays, calculateBookingPrice, getRoomTypePriceRates } from "@/lib/pricing";

interface HostelBookingWidgetProps {
  hostel: any;
  roomTypes: any[];
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: string;
  initialStayType?: string;
}

export const HostelBookingWidget: React.FC<HostelBookingWidgetProps> = ({
  hostel,
  roomTypes,
  initialCheckIn,
  initialCheckOut,
  initialGuests,
  initialStayType,
}) => {
  const router = useRouter();

  const todayStr = new Date().toISOString().split("T")[0];
  const defaultOut = new Date();
  defaultOut.setDate(defaultOut.getDate() + 3);
  const defaultOutStr = defaultOut.toISOString().split("T")[0];

  const [checkIn, setCheckIn] = useState(initialCheckIn || todayStr);
  const [checkOut, setCheckOut] = useState(initialCheckOut || defaultOutStr);
  const [stayType, setStayType] = useState(initialStayType === "MONTHLY" ? "MONTHLY" : "DAILY");
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState(
    roomTypes[0]?.id || ""
  );

  const selectedRoomType = useMemo(
    () => roomTypes.find((r) => r.id === selectedRoomTypeId) || roomTypes[0],
    [roomTypes, selectedRoomTypeId]
  );

  // Get starting price - use Non-AC daily rate as default
  const startingPrice = useMemo(() => {
    if (!selectedRoomType) return 599;
    return getRoomTypePriceRates(selectedRoomType, false).daily;
  }, [selectedRoomType]);

  // Compute live price quote
  const pricingQuote = useMemo(() => {
    if (!selectedRoomType) return null;
    const cIn = new Date(checkIn);
    const monthlyEnd = addUtcCalendarDays(cIn, 30);
    const cOut = stayType === "MONTHLY" ? monthlyEnd : new Date(checkOut);
    if (isNaN(cIn.getTime()) || isNaN(cOut.getTime()) || cOut <= cIn) return null;

    const rates = getRoomTypePriceRates(selectedRoomType, false);
    return calculateBookingPrice({
      checkInDate: cIn,
      checkOutDate: cOut,
      basePrice: rates.daily,
      rates,
      stayType: stayType === "MONTHLY" ? "MONTHLY" : "DAILY",
      weeklyDiscountPct: selectedRoomType.weeklyDiscountPct,
      monthlyPrice: rates.days30,
      securityDeposit: selectedRoomType.securityDeposit,
      maintenanceFee: (selectedRoomType as any).maintenanceFee,
    });
  }, [selectedRoomType, checkIn, checkOut, stayType]);

  const handleProceed = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(
      `/book?hostel=${hostel.slug}&roomType=${selectedRoomTypeId}&stayType=${stayType}&checkIn=${checkIn}&checkOut=${stayType === "MONTHLY" ? "" : checkOut}&guests=1`
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
              ₹{(stayType === "MONTHLY" && selectedRoomType ? getRoomTypePriceRates(selectedRoomType, false).days30 : startingPrice).toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">/ {stayType === "MONTHLY" ? "month" : "night"}</span>
          </div>
        </div>
        <span className="text-xs font-bold text-pink-400 bg-pink-950/60 border border-pink-500/30 px-3 py-1 rounded-full">
          Reservation
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <CustomSelect label="Stay type" value={stayType} onValueChange={setStayType} triggerClassName="rounded-xl border border-slate-700/80 bg-slate-900/80 p-3" options={[{ value: "DAILY", label: "Daily stay" }, { value: "MONTHLY", label: "Monthly tenant" }]} />
          {stayType === "MONTHLY" && <p className="mt-1 text-xs text-slate-400">Month-to-month tenancy. Choose your move-in date; no checkout date is required.</p>}
        </div>
        {/* Room Type Selector */}
        <div>
          <CustomSelect label="Room / Dorm Type" value={selectedRoomTypeId} onValueChange={setSelectedRoomTypeId} triggerClassName="rounded-xl border border-slate-700/80 bg-slate-900/80 p-3" options={roomTypes.map((rt) => {
            const rates = getRoomTypePriceRates(rt, false);
            const price = stayType === "MONTHLY" ? rates.days30 : rates.daily;
            return { value: rt.id, label: `${rt.name} (${rt.genderCategory}) — ₹${price}/${stayType === "MONTHLY" ? "month" : "day"}` };
          })} />
        </div>

        {/* Date Inputs */}
        <div className={stayType === "MONTHLY" ? "grid grid-cols-1 gap-3" : "grid grid-cols-2 gap-3"}>
          <DatePicker label="Check-In" min={todayStr} value={checkIn} onChange={setCheckIn} triggerClassName="min-h-12 rounded-xl border border-slate-700/80 bg-slate-900/80 p-2.5" />
          {stayType !== "MONTHLY" && <DatePicker label="Check-Out" min={checkIn || todayStr} value={checkOut} onChange={setCheckOut} triggerClassName="min-h-12 rounded-xl border border-slate-700/80 bg-slate-900/80 p-2.5" />}
        </div>

        {/* Guests */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1.5 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            Number of Guests
          </label>
          <div className="w-full p-3 rounded-xl bg-slate-900/80 border border-slate-700/80 text-sm font-semibold text-white">1 resident per bed</div>
        </div>
      </div>

      {/* Live Breakdown Quote */}
      {pricingQuote && (
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2.5 text-xs text-slate-300">
          <div className="flex justify-between">
            <span>
              {stayType === "MONTHLY" ? "First month estimate" : `Stay Duration (${pricingQuote.nights} ${pricingQuote.nights === 1 ? "night" : "nights"})`}
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
            <span>
              {pricingQuote.stayType === "MONTHLY"
                ? "Maintenance Fee"
                : "Service Fee"}
            </span>
            <span className="font-semibold text-white">
              ₹{pricingQuote.serviceFee.toLocaleString()}
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
        <span>Reserve your bed now; payment setup will be available later.</span>
      </div>
    </form>
  );
};

export default HostelBookingWidget;
