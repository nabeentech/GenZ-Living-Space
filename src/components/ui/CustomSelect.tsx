"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: string;
  options: SelectOption[];
  onValueChange: (value: string) => void;
  label?: string;
  className?: string;
  triggerClassName?: string;
}

export default function CustomSelect({ value, options, onValueChange, label, className = "", triggerClassName = "" }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

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

  return <div ref={rootRef} className={`relative ${className}`}>
    <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} className={`w-full text-left cursor-pointer ${triggerClassName}`}>
      <span className="flex items-center justify-between gap-3">
        <span className="min-w-0">{label && <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-indigo-400">{label}</span>}<span className="block truncate text-sm font-semibold text-white">{selected?.label || "Select an option"}</span></span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </span>
    </button>
    {open && <div role="listbox" className="absolute left-0 top-[calc(100%+0.5rem)] z-[70] max-h-64 w-full overflow-y-auto rounded-xl border border-slate-700 bg-[#111827] p-1.5 shadow-2xl shadow-black/50">
      {options.map((option) => <button key={option.value} type="button" role="option" aria-selected={option.value === value} disabled={option.disabled} onClick={() => { onValueChange(option.value); setOpen(false); }} className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${option.value === value ? "bg-indigo-600/20 text-indigo-200" : "text-slate-200 hover:bg-slate-800"} disabled:cursor-not-allowed disabled:opacity-40`}>
        <span>{option.label}</span>{option.value === value && <Check className="h-4 w-4 shrink-0 text-indigo-300" />}
      </button>)}
    </div>}
  </div>;
}
