import React from "react";

export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-32 rounded bg-slate-800" />
        <div className="h-8 w-64 rounded-xl bg-slate-800" />
        <div className="h-3 w-80 max-w-full rounded bg-slate-800/70" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl border border-slate-800 bg-[#101626]/80 p-5 space-y-3">
            <div className="h-3 w-24 rounded bg-slate-800" />
            <div className="h-7 w-28 rounded-lg bg-slate-800" />
            <div className="h-2.5 w-32 rounded bg-slate-800/70" />
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-800 bg-[#111827]/80 p-6 space-y-4">
        <div className="h-5 w-48 rounded bg-slate-800" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="h-12 rounded-xl bg-slate-900/70 border border-slate-800/60" />
          ))}
        </div>
      </div>
    </div>
  );
}
