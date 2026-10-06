"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Bell, Sparkles } from "lucide-react";

interface AdminTopBarProps {
  user: {
    name: string;
    role: string;
  };
}

export const AdminTopBar: React.FC<AdminTopBarProps> = ({ user }) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/admin/bookings?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#0B0F19]/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
      {/* Global Search Bar */}
      <form onSubmit={handleSearch} className="max-w-md w-full relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by Booking Ref, Guest Name, Bed, or Phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </form>

      {/* Right Stats & Status */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>2 Properties Online</span>
        </div>

        <div className="text-right hidden sm:block">
          <span className="text-xs font-bold text-white block">{user.name}</span>
          <span className="text-[10px] text-indigo-400 font-mono">
            {user.role.replace("_", " ")}
          </span>
        </div>
      </div>
    </header>
  );
};

export default AdminTopBar;
