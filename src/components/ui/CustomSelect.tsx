"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
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
  icon?: React.ReactNode;
  className?: string;
  triggerClassName?: string;
}

interface PopupCoords {
  top?: number;
  bottom?: number;
  left: number;
  minWidth: number;
  maxHeight: number;
}

export default function CustomSelect({
  value,
  options,
  onValueChange,
  label,
  icon,
  className = "",
  triggerClassName = "",
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<PopupCoords>({
    left: 0,
    minWidth: 0,
    maxHeight: 240,
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setOpen(false);
      return;
    }

    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const openUpward = spaceBelow < 220 && spaceAbove > spaceBelow;
    const availableHeight = openUpward ? spaceAbove - gap - 16 : spaceBelow - gap - 16;
    const maxHeight = Math.max(120, Math.min(240, availableHeight));

    const minWidth = rect.width;
    let left = rect.left;
    if (left + minWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - 8 - minWidth);
    }
    left = Math.max(8, left);

    setCoords({
      top: openUpward ? undefined : rect.bottom + gap,
      bottom: openUpward ? window.innerHeight - rect.top + gap : undefined,
      left,
      minWidth,
      maxHeight,
    });
  }, []);

  const handleToggle = () => {
    if (!open) {
      updateCoords();
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    updateCoords();
    const handleEvents = () => updateCoords();
    window.addEventListener("resize", handleEvents);
    window.addEventListener("scroll", handleEvents, true);
    return () => {
      window.removeEventListener("resize", handleEvents);
      window.removeEventListener("scroll", handleEvents, true);
    };
  }, [open, updateCoords]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popupRef.current &&
        !popupRef.current.contains(target)
      ) {
        setOpen(false);
      }
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
  }, [open]);

  return (
    <div className={`relative ${open ? "z-50" : "z-10"} ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={handleToggle}
        className={`w-full text-left cursor-pointer ${triggerClassName}`}
      >
        <span className="flex items-center justify-between gap-3">
          <span className="min-w-0">
            {label && (
              <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                {icon}
                {label}
              </span>
            )}
            <span className="block truncate text-sm sm:text-base font-semibold text-white">
              {selected?.label || "Select an option"}
            </span>
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </span>
      </button>

      {open &&
        mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popupRef}
            role="listbox"
            className="z-[99999] w-max max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl border border-slate-700 bg-[#111827] p-1.5 shadow-2xl shadow-black/95 scrollbar-thin"
            style={{
              position: "fixed",
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
              left: `${coords.left}px`,
              minWidth: `${coords.minWidth}px`,
              maxHeight: `${coords.maxHeight}px`,
            }}
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                disabled={option.disabled}
                onClick={() => {
                  onValueChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs sm:text-sm whitespace-nowrap transition ${
                  option.value === value
                    ? "bg-indigo-600/20 text-indigo-200"
                    : "text-slate-200 hover:bg-slate-800"
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <span>{option.label}</span>
                {option.value === value && (
                  <Check className="h-4 w-4 shrink-0 text-indigo-300" />
                )}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
