"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, MapPin, Users, Search, ArrowRight } from "lucide-react";
import Button from "../ui/Button";

const HOSTELS = [
  { id: "all", name: "All 2 Properties (Madhapur - HYD)" },
  { id: "madhapur-01-hyd", name: "Madhapur - 01" },
  { id: "madhapur-02-hyd", name: "Madhapur - 02" },
];

export const HeroSearch: React.FC = () => {
  const router = useRouter();
  const [selectedHostel, setSelectedHostel] = useState("all");

  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 3);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const [checkIn, setCheckIn] = useState(todayStr);
  const [checkOut, setCheckOut] = useState(tomorrowStr);
  const [guests, setGuests] = useState(1);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedHostel !== "all") {
      router.push(
        `/hostels/${selectedHostel}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`
      );
    } else {
      router.push(`/hostels?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`);
    }
  };

  return (
    <form
      onSubmit={handleSearch}
      className="w-full glass-panel bg-[#111827]/90 border border-slate-700/70 p-4 sm:p-5 rounded-3xl shadow-2xl backdrop-blur-xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 lg:gap-4">
        {/* Hostel / Location Selector */}
        <div className="flex flex-col p-3 rounded-2xl bg-slate-900/70 border border-slate-800/80 focus-within:border-indigo-500/80 transition">
          <label className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 mb-1">
            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
            Select Hostel
          </label>
          <select
            value={selectedHostel}
            onChange={(e) => setSelectedHostel(e.target.value)}
            className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer truncate"
          >
            {HOSTELS.map((h) => (
              <option key={h.id} value={h.id} className="bg-[#111827] text-white">
                {h.name}
              </option>
            ))}
          </select>
        </div>

        {/* Check-In Date */}
        <div className="flex flex-col p-3 rounded-2xl bg-slate-900/70 border border-slate-800/80 focus-within:border-indigo-500/80 transition">
          <label className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 mb-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            Check-In
          </label>
          <input
            type="date"
            min={todayStr}
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer"
          />
        </div>

        {/* Check-Out Date */}
        <div className="flex flex-col p-3 rounded-2xl bg-slate-900/70 border border-slate-800/80 focus-within:border-indigo-500/80 transition">
          <label className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 mb-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            Check-Out
          </label>
          <input
            type="date"
            min={checkIn || todayStr}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer"
          />
        </div>

        {/* Guests & Search Button */}
        <div className="flex gap-2 items-center">
          <div className="flex-1 flex flex-col p-3 rounded-2xl bg-slate-900/70 border border-slate-800/80 focus-within:border-indigo-500/80 transition">
            <label className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              Guests
            </label>
            <select
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <option key={num} value={num} className="bg-[#111827] text-white">
                  {num} {num === 1 ? "Guest" : "Guests"}
                </option>
              ))}
            </select>
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
