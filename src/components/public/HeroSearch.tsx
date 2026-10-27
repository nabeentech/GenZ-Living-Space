"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Search } from "lucide-react";
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
      `/hostels/genz-colive-pg-guest-rooms?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`
    );
  };

  return (
    <form
      onSubmit={handleSearch}
      className="w-full relative z-30 bg-[#0B1120]/80 backdrop-blur-xl border border-indigo-500/30 p-2.5 sm:p-3 rounded-3xl shadow-[0_15px_40px_rgba(0,0,0,0.5)] transition hover:border-indigo-500/50"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] gap-2.5 sm:gap-3 items-center">
        {/* Check-In Date */}
        <DatePicker
          label="CHECK-IN"
          min={todayStr}
          value={checkIn}
          onChange={setCheckIn}
          triggerClassName="w-full h-[4.5rem] rounded-2xl border border-slate-700/60 bg-[#121B2F]/90 hover:bg-[#16233E] hover:border-indigo-500/60 p-3 sm:px-4 sm:py-3 transition flex flex-col justify-center"
        />

        {/* Check-Out Date */}
        <DatePicker
          label="CHECK-OUT"
          min={checkIn || todayStr}
          value={checkOut}
          onChange={setCheckOut}
          triggerClassName="w-full h-[4.5rem] rounded-2xl border border-slate-700/60 bg-[#121B2F]/90 hover:bg-[#16233E] hover:border-indigo-500/60 p-3 sm:px-4 sm:py-3 transition flex flex-col justify-center"
        />

        {/* Guests */}
        <CustomSelect
          label="GUESTS"
          icon={<Users className="w-3.5 h-3.5 text-indigo-400" />}
          value={String(guests)}
          options={[1, 2, 3, 4, 5, 6].map((num) => ({
            value: String(num),
            label: `${num} ${num === 1 ? "Guest" : "Guests"}`,
          }))}
          onValueChange={(value) => setGuests(Number(value))}
          triggerClassName="w-full h-[4.5rem] rounded-2xl border border-slate-700/60 bg-[#121B2F]/90 hover:bg-[#16233E] hover:border-indigo-500/60 p-3 sm:px-4 sm:py-3 transition flex flex-col justify-center"
        />

        {/* Search Button */}
        <button
          type="submit"
          aria-label="Search Beds"
          className="w-full lg:w-[4.5rem] h-[4.5rem] rounded-2xl bg-gradient-to-tr from-purple-600 via-purple-500 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white flex items-center justify-center shadow-[0_0_25px_rgba(168,85,247,0.45)] hover:shadow-[0_0_35px_rgba(236,72,153,0.55)] transition-all transform active:scale-95 shrink-0 group cursor-pointer"
        >
          <Search className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
        </button>
      </div>
    </form>
  );
};

export default HeroSearch;
