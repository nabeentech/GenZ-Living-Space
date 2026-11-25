"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CustomSelect from "@/components/ui/CustomSelect";

interface DashboardFilterBarProps {
  hostels: Array<{ id: string; name: string }>;
  selectedHostelId: string;
  selectedRange: string;
}

export const DashboardFilterBar: React.FC<DashboardFilterBarProps> = ({
  hostels,
  selectedHostelId,
  selectedRange,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (!val || val === "all") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    const qs = params.toString();
    router.push(qs ? `/admin?${qs}` : "/admin");
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-[#101626]/80 p-3.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
          Show:
        </span>
        {[
          { id: "all", label: "All Time" },
          { id: "today", label: "Today" },
          { id: "thisMonth", label: "This Month" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => updateParams({ range: item.id })}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedRange === item.id
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="w-full sm:w-64">
        <CustomSelect
          value={selectedHostelId}
          onValueChange={(val) => updateParams({ hostelId: val })}
          options={[
            { value: "all", label: "All Properties" },
            ...hostels.map((h) => ({ value: h.id, label: h.name })),
          ]}
          triggerClassName="p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs"
        />
      </div>
    </div>
  );
};

export default DashboardFilterBar;
