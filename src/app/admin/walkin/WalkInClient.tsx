"use client";

import React, { useState, useMemo } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  UserPlus,
  Calendar,
  CheckCircle2,
  Bed as BedIcon,
  CreditCard,
  Sparkles,
} from "lucide-react";

interface WalkInClientProps {
  hostels: any[];
}

export const WalkInClient: React.FC<WalkInClientProps> = ({ hostels }) => {
  const [selectedHostelId, setSelectedHostelId] = useState(hostels[0]?.id || "");

  const activeHostel = useMemo(
    () => hostels.find((h) => h.id === selectedHostelId) || hostels[0],
    [hostels, selectedHostelId]
  );

  const rooms = useMemo(() => activeHostel?.rooms || [], [activeHostel]);

  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.id || "");

  const activeRoom = useMemo(
    () => rooms.find((r: any) => r.id === selectedRoomId) || rooms[0],
    [rooms, selectedRoomId]
  );

  const availableBeds = useMemo(() => activeRoom?.beds || [], [activeRoom]);
  const [selectedBedId, setSelectedBedId] = useState(availableBeds[0]?.id || "");

  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const [checkIn, setCheckIn] = useState(todayStr);
  const [checkOut, setCheckOut] = useState(tomorrowStr);

  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestGovtId, setGuestGovtId] = useState("");
  const [guestGender, setGuestGender] = useState("MALE");
  const [guestDateOfBirth, setGuestDateOfBirth] = useState("");

  const [priceOverride, setPriceOverride] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [autoCheckIn, setAutoCheckIn] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Default suggested price
  const suggestedPrice = useMemo(() => {
    if (!activeRoom?.roomType) return 999;
    const diffDays = Math.max(
      1,
      Math.ceil(
        (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
    return activeRoom.roomType.basePrice * diffDays;
  }, [activeRoom, checkIn, checkOut]);

  const finalAmount = priceOverride > 0 ? priceOverride : suggestedPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !guestPhone || !selectedBedId) {
      alert("Please enter guest name, phone, and select a bed.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/admin/walkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName,
          guestPhone,
          guestEmail,
          guestGovtId,
          guestGender,
          guestDateOfBirth,
          hostelId: selectedHostelId,
          roomId: selectedRoomId,
          bedId: selectedBedId,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          totalAmount: finalAmount,
          paymentMethod,
          autoCheckIn,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to create walk-in");
      }

      setSuccessMsg(json.message);
      setGuestName("");
      setGuestPhone("");
      setGuestEmail("");
      setGuestGovtId("");
      setGuestDateOfBirth("");
      setTimeout(() => {
        setSuccessMsg("");
        window.location.reload();
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-[#111827]/85 max-w-4xl space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white">New Walk-In Registration</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Issue immediate keycard and assign vacant bed for arriving guest.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500 text-xs text-emerald-300 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500 text-xs text-rose-300 font-semibold">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Hostel, Room, Bed Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
              Hostel Property
            </label>
            <select
              value={selectedHostelId}
              onChange={(e) => {
                setSelectedHostelId(e.target.value);
                const h = hostels.find((item) => item.id === e.target.value);
                if (h?.rooms?.[0]) {
                  setSelectedRoomId(h.rooms[0].id);
                  if (h.rooms[0].beds?.[0]) setSelectedBedId(h.rooms[0].beds[0].id);
                }
              }}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none"
            >
              {hostels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.city})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
              Room Category
            </label>
            <select
              value={selectedRoomId}
              onChange={(e) => {
                setSelectedRoomId(e.target.value);
                const r = rooms.find((item: any) => item.id === e.target.value);
                if (r?.beds?.[0]) setSelectedBedId(r.beds[0].id);
              }}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none"
            >
              {rooms.map((r: any) => (
                <option key={r.id} value={r.id}>
                  Room {r.roomNumber} ({r.roomType?.name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
              Available Bed
            </label>
            <select
              value={selectedBedId}
              onChange={(e) => setSelectedBedId(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-emerald-400 focus:outline-none"
            >
              {availableBeds.length === 0 ? (
                <option value="">No vacant beds in this room</option>
              ) : (
                availableBeds.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.bedNumber} ({b.tier?.replace("_", " ")})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
              Check-In Date
            </label>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
              Check-Out Date
            </label>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none"
            />
          </div>
        </div>

        {/* Guest Information */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
              Guest Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sameer Kulkarni"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
              Mobile Number *
            </label>
            <input
              type="tel"
              required
              placeholder="+91 98765 43210"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
              Email (Optional)
            </label>
            <input
              type="email"
              placeholder="guest@gmail.com"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
              Govt ID Number (Aadhaar/Passport)
            </label>
            <input
              type="text"
              placeholder="XXXX-XXXX-XXXX"
              value={guestGovtId}
              onChange={(e) => setGuestGovtId(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
              Gender
            </label>
            <select
              value={guestGender}
              onChange={(e) => setGuestGender(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none"
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
              Date of Birth (Optional)
            </label>
            <input
              type="date"
              value={guestDateOfBirth}
              onChange={(e) => setGuestDateOfBirth(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none font-semibold"
            >
              <option value="cash">Cash at Reception</option>
              <option value="upi">UPI / QR Code</option>
              <option value="card">Credit / Debit Card</option>
              <option value="bank_transfer">Direct Bank Transfer</option>
            </select>
          </div>
        </div>

        {/* Pricing & Checkin Toggle */}
        <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs text-slate-400 block">
              Calculated Total (Override if discount agreed):
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-black text-white">
                ₹{finalAmount.toLocaleString()}
              </span>
              <input
                type="number"
                placeholder="Custom ₹"
                value={priceOverride || ""}
                onChange={(e) => setPriceOverride(Number(e.target.value))}
                className="w-32 p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200">
            <input
              type="checkbox"
              checked={autoCheckIn}
              onChange={(e) => setAutoCheckIn(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span>Auto Check-In & mark bed OCCUPIED immediately</span>
          </label>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="glow"
            size="lg"
            isLoading={isSubmitting}
            disabled={!selectedBedId}
            rightIcon={<UserPlus className="w-4 h-4" />}
          >
            Create Walk-In & Issue Keycard
          </Button>
        </div>
      </form>
    </div>
  );
};

export default WalkInClient;
