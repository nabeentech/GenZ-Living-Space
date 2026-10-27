"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  min?: string;
  className?: string;
  triggerClassName?: string;
}

const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function DatePicker({ value, onChange, label, min, className = "", triggerClassName = "" }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const selected = value ? new Date(`${value}T12:00:00`) : new Date();
    return new Date(selected.getFullYear(), selected.getMonth(), 1);
  });
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, []);

  const days = useMemo(() => {
    const firstWeekday = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1).getDay();
    const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
    const offset = (firstWeekday + 6) % 7;
    return Array.from({ length: Math.ceil((offset + daysInMonth) / 7) * 7 }, (_, index) => {
      const day = index - offset + 1;
      return day < 1 || day > daysInMonth ? null : new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day);
    });
  }, [visibleMonth]);

  const selectedDate = value ? new Date(`${value}T12:00:00`) : null;
  const selectedLabel = selectedDate?.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div ref={rootRef} className={`relative ${open ? "z-50" : "z-10"} ${className}`}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (!open && value) setVisibleMonth(new Date(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, 1));
          setOpen((current) => !current);
        }}
        className={`w-full text-left cursor-pointer ${triggerClassName}`}
      >
        <span className="flex items-center justify-between gap-3">
          <span className="min-w-0">
            {label && <span className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-400"><CalendarDays className="h-3.5 w-3.5" />{label}</span>}
            <span className="block truncate text-sm font-semibold text-white">{selectedLabel || "Choose a date"}</span>
          </span>
          <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
        </span>
      </button>

      {open && <div role="dialog" aria-label={label ? `${label} calendar` : "Choose date"} className="absolute left-0 top-[calc(100%+0.5rem)] z-[70] w-[min(19.5rem,calc(100vw-2rem))] rounded-2xl border border-slate-700 bg-[#111827] p-3.5 sm:p-4 shadow-2xl shadow-black/90">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="font-bold text-white text-sm sm:text-base">{visibleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
          <div className="flex gap-1">
            <button type="button" aria-label="Previous month" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))} className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" aria-label="Next month" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))} className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-semibold text-slate-500">{"MTWTFSS".split("").map((day, index) => <span key={`${day}-${index}`} className="py-1">{day}</span>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            if (!day) return <span key={`empty-${index}`} />;
            const key = dateKey(day);
            const isDisabled = Boolean(min && key < min);
            const isSelected = key === value;
            const isToday = key === dateKey(new Date());
            return <button key={key} type="button" disabled={isDisabled} onClick={() => { onChange(key); setOpen(false); }} className={`h-8 rounded-lg text-xs transition ${isSelected ? "bg-indigo-600 font-bold text-white shadow-glow" : isToday ? "border border-indigo-500/60 text-indigo-300" : "text-slate-200 hover:bg-slate-800"} disabled:cursor-not-allowed disabled:text-slate-700`}>{day.getDate()}</button>;
          })}
        </div>
        <div className="mt-2.5 flex justify-between border-t border-slate-800 pt-2.5">
          <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="text-xs font-semibold text-slate-400 hover:text-white">Clear</button>
          <button type="button" onClick={() => { const today = dateKey(new Date()); if (!min || today >= min) onChange(today); setOpen(false); }} className="text-xs font-semibold text-indigo-300 hover:text-white">Today</button>
        </div>
      </div>}
    </div>
  );
}
