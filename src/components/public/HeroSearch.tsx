"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Search } from "lucide-react";
import Button from "../ui/Button";
import DatePicker from "../ui/DatePicker";
import CustomSelect from "../ui/CustomSelect";

export const HeroSearch: React.FC = () => {
  const router = useRouter();

  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 3);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const [checkIn, setCheckIn] = useState(todayStr);
  const [checkOut, setCheckOut] = useState(tomorrowStr);
  const [guests, setGuests] = useState(1);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(
      `/hostels/madhapur-01-hyd?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`
    );
  };

  return (
    <form
      onSubmit={handleSearch}
      className="w-full glass-panel bg-[#111827]/90 border border-slate-700/70 p-4 sm:p-5 rounded-3xl shadow-2xl backdrop-blur-xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">
        {/* Check-In Date */}
        <DatePicker label="Check-In" min={todayStr} value={checkIn} onChange={setCheckIn} triggerClassName="min-h-[4.5rem] rounded-2xl border border-slate-800/80 bg-slate-900/70 p-3 transition hover:border-indigo-500/80" />

        {/* Check-Out Date */}
        <DatePicker label="Check-Out" min={checkIn || todayStr} value={checkOut} onChange={setCheckOut} triggerClassName="min-h-[4.5rem] rounded-2xl border border-slate-800/80 bg-slate-900/70 p-3 transition hover:border-indigo-500/80" />

        {/* Guests & Search Button */}
        <div className="flex gap-2 items-center">
          <div className="flex-1 flex flex-col p-3 rounded-2xl bg-slate-900/70 border border-slate-800/80 focus-within:border-indigo-500/80 transition">
            <label className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              Guests
            </label>
            <CustomSelect value={String(guests)} options={[1, 2, 3, 4, 5, 6].map((num) => ({ value: String(num), label: `${num} ${num === 1 ? "Guest" : "Guests"}` }))} onValueChange={(value) => setGuests(Number(value))} triggerClassName="rounded-lg py-1 text-left" />
          </div>

          <Button
            type="submit"
            variant="glow"
            size="lg"
            className="h-full px-6 rounded-2xl shadow-glow"
          >
            <Search className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </form>
  );
};

export default HeroSearch;
