"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import DatePicker from "@/components/ui/DatePicker";
import {
  THEATER_SLOTS,
  addDaysToDateKey,
  formatTheaterDate,
  getTheaterSlotMeta,
  hasTheaterSlotStarted,
  isTheaterSlotPassed,
} from "@/lib/home-theater";
import {
  Film,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  Lock,
  Sparkles,
  XCircle,
  ArrowRight,
  Popcorn,
} from "lucide-react";

export interface CustomerTheaterSlotView {
  id: string;
  slotDateKey: string;
  slotKey: string;
  status: string;
  isMine: boolean;
  title: string | null;
}

export interface CustomerTheaterBooking {
  id: string;
  bookingCode: string;
  slotDateKey: string;
  slotKey: string;
  title: string | null;
  guestCount: number;
  notes: string | null;
  status: string;
  roomBedLabel: string | null;
  bookedByRole: string;
  createdAt: string;
}

interface HomeTheaterCustomerPanelProps {
  isActiveResident: boolean;
  activeStayLabel: string | null;
  initialDate: string;
  initialDaySlots: CustomerTheaterSlotView[];
  initialMyBookings: CustomerTheaterBooking[];
}

export const HomeTheaterCustomerPanel: React.FC<HomeTheaterCustomerPanelProps> = ({
  isActiveResident,
  activeStayLabel,
  initialDate,
  initialDaySlots,
  initialMyBookings,
}) => {
  const maxDate = useMemo(() => addDaysToDateKey(initialDate, 14), [initialDate]);
  const quickDates = useMemo(
    () => [
      { key: initialDate, label: "Today" },
      { key: addDaysToDateKey(initialDate, 1), label: "Tomorrow" },
      { key: addDaysToDateKey(initialDate, 2), label: formatTheaterDate(addDaysToDateKey(initialDate, 2)).slice(0, 11) },
      { key: addDaysToDateKey(initialDate, 3), label: formatTheaterDate(addDaysToDateKey(initialDate, 3)).slice(0, 11) },
    ],
    [initialDate]
  );

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [daySlots, setDaySlots] = useState<CustomerTheaterSlotView[]>(initialDaySlots);
  const [myBookings, setMyBookings] = useState<CustomerTheaterBooking[]>(initialMyBookings);
  const [loadingDate, setLoadingDate] = useState(false);

  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const [movieTitle, setMovieTitle] = useState("");
  const [guestCount, setGuestCount] = useState(2);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const loadDayAvailability = async (dateKey: string) => {
    setSelectedDate(dateKey);
    setSelectedSlotKey(null);
    setFeedback(null);
    setLoadingDate(true);
    try {
      const res = await fetch(`/api/theater?date=${encodeURIComponent(dateKey)}`);
      const data = await res.json();
      if (res.ok) {
        setDaySlots(data.daySlots || []);
        if (Array.isArray(data.myBookings)) {
          setMyBookings(data.myBookings);
        }
      }
    } catch {
      setFeedback({ type: "error", text: "Could not refresh slot availability." });
    } finally {
      setLoadingDate(false);
    }
  };

  const handleBookSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotKey) return;
    setFeedback(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/theater", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotDateKey: selectedDate,
          slotKey: selectedSlotKey,
          title: movieTitle.trim() || "Movie / Screening",
          guestCount,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", text: data.error || "Could not reserve slot." });
        await loadDayAvailability(selectedDate);
        return;
      }

      const booked = data.booking as CustomerTheaterBooking;
      setMyBookings((prev) => [booked, ...prev]);
      setDaySlots((prev) => [
        ...prev,
        {
          id: booked.id,
          slotDateKey: booked.slotDateKey,
          slotKey: booked.slotKey,
          status: booked.status,
          isMine: true,
          title: booked.title,
        },
      ]);
      setSelectedSlotKey(null);
      setMovieTitle("");
      setNotes("");
      setGuestCount(2);
      setFeedback({
        type: "success",
        text: `Reserved ${getTheaterSlotMeta(booked.slotKey).label} (${
          getTheaterSlotMeta(booked.slotKey).timeRange
        }) on ${formatTheaterDate(booked.slotDateKey)}. Booking Code: ${booked.bookingCode}`,
      });
    } catch {
      setFeedback({ type: "error", text: "Network error while booking slot." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async (booking: CustomerTheaterBooking) => {
    setCancellingId(booking.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/theater/${booking.id}`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", text: data.error || "Could not cancel booking." });
        return;
      }
      setMyBookings((prev) =>
        prev.map((b) => (b.id === booking.id ? { ...b, status: "CANCELLED" } : b))
      );
      setDaySlots((prev) => prev.filter((s) => s.id !== booking.id));
      setFeedback({
        type: "success",
        text: `Cancelled Home Theater slot (${booking.bookingCode}).`,
      });
    } catch {
      setFeedback({ type: "error", text: "Network error while cancelling booking." });
    } finally {
      setCancellingId(null);
    }
  };

  if (!isActiveResident) {
    return (
      <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-slate-800 bg-[#111827]/85 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6 text-indigo-400" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h3 className="text-lg font-black text-white">
            Home Theater Amenity — Active Residents Only
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Our private Home Theater room is a complimentary resident amenity. Once you have a confirmed or checked-in stay, you can reserve movie &amp; match screening slots right here for free.
          </p>
        </div>
        <div className="pt-1">
          <Link href="/search">
            <Button variant="glow" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Book a Resident Stay
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-[#131b2e] to-[#0f1524] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider">
              <Sparkles className="w-3 h-3" /> Free Resident Amenity · ₹0
            </span>
            {activeStayLabel && (
              <span className="text-[11px] font-semibold text-indigo-300">
                {activeStayLabel}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Film className="w-5 h-5 text-indigo-400" />
            Book the Home Theater
          </h2>
          <p className="text-xs text-slate-400">
            Reserve a 3-hour private screening slot for movies, cricket matches, or gaming nights with fellow residents (up to 14 days ahead, max 1 slot/day).
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Date Picker & Slot Selection */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-800 bg-[#111827]/85 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              1. Choose Date ({formatTheaterDate(selectedDate)})
            </h3>
            <p className="text-[11px] text-slate-400">
              Tap a quick date or pick any day in the next 2 weeks
            </p>
          </div>

          <div className="w-48">
            <DatePicker
              value={selectedDate}
              min={initialDate}
              max={maxDate}
              onChange={(val) => loadDayAvailability(val)}
              triggerClassName="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {quickDates.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => loadDayAvailability(d.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedDate === d.key
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                  : "bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="space-y-2.5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            2. Pick a Time Slot {loadingDate && <span className="text-xs text-slate-400">(Checking...)</span>}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {THEATER_SLOTS.map((slot) => {
              const taken = daySlots.find((s) => s.slotKey === slot.key);
              const passed = isTheaterSlotPassed(selectedDate, slot.key);
              const isSelected = selectedSlotKey === slot.key;

              let statusText = "Available · Free";
              let cardStyle =
                "border-slate-700 bg-slate-900/75 hover:border-indigo-500/60 text-white cursor-pointer";
              let badgeEl = (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Available
                </span>
              );
              let disabled = false;

              if (taken?.isMine) {
                disabled = true;
                statusText = taken.title ? `Your Booking: ${taken.title}` : "Booked by You";
                cardStyle = "border-indigo-500/50 bg-indigo-500/15 text-indigo-100 opacity-90 cursor-not-allowed";
                badgeEl = (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/40">
                    Your Slot
                  </span>
                );
              } else if (taken?.status === "BLOCKED") {
                disabled = true;
                statusText = taken.title || "Maintenance / Management Event";
                cardStyle = "border-amber-500/30 bg-amber-500/10 text-amber-200 opacity-75 cursor-not-allowed";
                badgeEl = (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300">
                    Reserved
                  </span>
                );
              } else if (taken) {
                disabled = true;
                statusText = "Reserved by a fellow resident";
                cardStyle = "border-slate-800 bg-slate-950/70 text-slate-400 opacity-70 cursor-not-allowed";
                badgeEl = (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                    Booked
                  </span>
                );
              } else if (passed) {
                disabled = true;
                statusText = "Slot time has ended";
                cardStyle = "border-slate-800 bg-slate-950/60 text-slate-500 opacity-60 cursor-not-allowed";
                badgeEl = (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
                    Ended
                  </span>
                );
              } else if (isSelected) {
                cardStyle =
                  "border-indigo-500 bg-indigo-600/20 text-white shadow-lg shadow-indigo-500/15 cursor-pointer ring-1 ring-indigo-500";
                badgeEl = (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                    Selected
                  </span>
                );
              }

              return (
                <button
                  key={slot.key}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSelectedSlotKey(isSelected ? null : slot.key)}
                  className={`p-4 rounded-2xl border text-left transition space-y-2 ${cardStyle}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider">
                      {slot.label}
                    </span>
                    {badgeEl}
                  </div>
                  <div className="text-sm font-black">{slot.timeRange}</div>
                  <div className="text-[11px] opacity-80 truncate">{statusText}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Confirm Booking Form when a slot is chosen */}
        {selectedSlotKey && (
          <form
            onSubmit={handleBookSlot}
            className="p-5 rounded-2xl border border-indigo-500/40 bg-indigo-950/20 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Popcorn className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-bold text-white">
                  3. Confirm Free Reservation —{" "}
                  {getTheaterSlotMeta(selectedSlotKey).label} (
                  {getTheaterSlotMeta(selectedSlotKey).timeRange}) on{" "}
                  {formatTheaterDate(selectedDate)}
                </span>
              </div>
              <Badge variant="available" size="sm">
                Complimentary · ₹0
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  What are you watching / occasion? (Optional)
                </label>
                <input
                  type="text"
                  maxLength={80}
                  value={movieTitle}
                  onChange={(e) => setMovieTitle(e.target.value)}
                  placeholder="e.g., Interstellar, Cricket Match, PS5 Gaming Night"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  People Joining (1–12)
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={guestCount}
                  onChange={(e) =>
                    setGuestCount(Math.max(1, Math.min(12, Number(e.target.value) || 1)))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Notes for Reception (Optional)
              </label>
              <input
                type="text"
                maxLength={240}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Need HDMI cable / AC remote"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedSlotKey(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="glow" size="sm" isLoading={submitting}>
                Confirm Free Slot Booking
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* My Theater Bookings */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-800 bg-[#111827]/85 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">
            My Home Theater Bookings ({myBookings.length})
          </h3>
          <p className="text-xs text-slate-400">
            Show your Booking Code at the reception desk if needed to collect the theater remote/key
          </p>
        </div>

        {myBookings.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            You haven&apos;t booked any Home Theater slots yet. Pick an available slot above!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {myBookings.map((b) => {
              const slotMeta = getTheaterSlotMeta(b.slotKey);
              const canCancel =
                b.status === "BOOKED" && !hasTheaterSlotStarted(b.slotDateKey, b.slotKey);

              return (
                <div
                  key={b.id}
                  className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-400">
                          {b.bookingCode}
                        </span>
                        <Badge
                          variant={
                            b.status === "BOOKED"
                              ? "available"
                              : b.status === "COMPLETED"
                              ? "indigo"
                              : "danger"
                          }
                          size="sm"
                        >
                          {b.status === "BOOKED"
                            ? "Reserved"
                            : b.status === "COMPLETED"
                            ? "Completed"
                            : "Cancelled"}
                        </Badge>
                      </div>
                      <h4 className="text-sm font-bold text-white">
                        {b.title || "Movie / Screening"}
                      </h4>
                    </div>

                    {canCancel && (
                      <Button
                        variant="outline"
                        size="sm"
                        isLoading={cancellingId === b.id}
                        onClick={() => handleCancelBooking(b)}
                        className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      {formatTheaterDate(b.slotDateKey)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      {slotMeta.timeRange}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      {b.guestCount} {b.guestCount === 1 ? "person" : "people"}
                    </span>
                  </div>

                  {b.notes && <p className="text-[11px] text-slate-400 italic">{b.notes}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
