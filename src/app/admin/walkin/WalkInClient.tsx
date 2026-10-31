"use client";

import React, { useState, useMemo } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import CustomSelect from "@/components/ui/CustomSelect";
import DatePicker from "@/components/ui/DatePicker";
import { addUtcCalendarDays, calculateBookingPrice, getRoomTypePriceRates } from "@/lib/pricing";
import { SHARING_NAMES } from "@/lib/room-types";
import {
  UserPlus,
  Calendar,
  CheckCircle2,
  Bed as BedIcon,
  CreditCard,
  Sparkles,
} from "lucide-react";

const toLocalDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

interface WalkInClientProps {
  hostels: any[];
}

interface AdditionalGuest {
  name: string;
  phone: string;
  email: string;
  govtId: string;
  gender: string;
  dateOfBirth: string;
}

const createAdditionalGuest = (): AdditionalGuest => ({
  name: "",
  phone: "",
  email: "",
  govtId: "",
  gender: "MALE",
  dateOfBirth: "",
});

export const WalkInClient: React.FC<WalkInClientProps> = ({ hostels }) => {
  const [selectedHostelId, setSelectedHostelId] = useState(hostels[0]?.id || "");

  const activeHostel = useMemo(
    () => hostels.find((h) => h.id === selectedHostelId) || hostels[0],
    [hostels, selectedHostelId]
  );

  const rooms = useMemo(() => activeHostel?.rooms || [], [activeHostel]);

  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState(rooms[0]?.roomTypeId || "");
  const [selectedFloor, setSelectedFloor] = useState(rooms[0] ? String(rooms[0].floor) : "");
  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.id || "");
  const roomTypes = useMemo(() => Array.from(
    new Map<string, any>(rooms.filter((room: any) => room.roomType).map((room: any) => [room.roomTypeId, room.roomType])).values()
  ), [rooms]);
  const roomsForType = useMemo(() => rooms.filter((room: any) => room.roomTypeId === selectedRoomTypeId), [rooms, selectedRoomTypeId]);
  const floorsForType = useMemo<string[]>(() => Array.from(new Set<string>(roomsForType.map((room: any) => String(room.floor)))).sort((a, b) => Number(a) - Number(b)), [roomsForType]);
  const roomsForFloor = useMemo(() => roomsForType.filter((room: any) => String(room.floor) === selectedFloor), [roomsForType, selectedFloor]);

  const activeRoom = useMemo(
    () => roomsForFloor.find((room: any) => room.id === selectedRoomId) || roomsForFloor[0],
    [roomsForFloor, selectedRoomId]
  );

  const availableBeds = useMemo(() => activeRoom?.beds || [], [activeRoom]);
  const [selectedBedId, setSelectedBedId] = useState(availableBeds.find((bed: any) => bed.status === "AVAILABLE")?.id || "");
  const selectedBed = availableBeds.find((bed: any) => bed.id === selectedBedId);
  const maxGuestsForSelectedBed = selectedBed?.tier === "DOUBLE" ? 2 : 1;

  const todayStr = toLocalDateInput(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const tomorrowStr = toLocalDateInput(tomorrow);

  const [checkIn, setCheckIn] = useState(todayStr);
  const [checkOut, setCheckOut] = useState(tomorrowStr);
  const [stayType, setStayType] = useState<"DAILY" | "MONTHLY">("DAILY");
  const effectiveCheckOut = stayType === "MONTHLY"
    ? addUtcCalendarDays(new Date(`${checkIn}T00:00:00.000Z`), 30).toISOString().slice(0, 10)
    : checkOut;

  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestGovtId, setGuestGovtId] = useState("");
  const [guestGender, setGuestGender] = useState("MALE");
  const [guestDateOfBirth, setGuestDateOfBirth] = useState("");
  const [guestsCount, setGuestsCount] = useState(1);
  const [guestCountInput, setGuestCountInput] = useState("1");
  const [additionalGuests, setAdditionalGuests] = useState<AdditionalGuest[]>([]);

  const [priceOverride, setPriceOverride] = useState<number>(0);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 10);
    return toLocalDateInput(date);
  });
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [autoCheckIn, setAutoCheckIn] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stage, setStage] = useState(1);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Default suggested price
  const calculatedPricing = useMemo(() => {
    if (!activeRoom?.roomType) return null;
    const rates = getRoomTypePriceRates(activeRoom.roomType, activeRoom.isAC);
    return calculateBookingPrice({
      checkInDate: new Date(`${checkIn}T12:00:00`),
      checkOutDate: new Date(`${effectiveCheckOut}T12:00:00`),
      stayType,
      basePrice: rates.daily,
      rates,
      weeklyDiscountPct: activeRoom.roomType.weeklyDiscountPct,
      monthlyPrice: rates.days30,
      securityDeposit: activeRoom.roomType.securityDeposit,
      maintenanceFee: activeRoom.roomType.maintenanceFee,
    });
  }, [activeRoom, checkIn, effectiveCheckOut, stayType]);

  const suggestedPrice = calculatedPricing?.totalAmount ?? 999;
  const finalAmount = priceOverride > 0 ? priceOverride : suggestedPrice;
  const remainingAmount = Math.max(0, finalAmount - advanceAmount);
  const allGuestDetails = [
    { name: guestName, phone: guestPhone, email: guestEmail, govtId: guestGovtId, gender: guestGender, dateOfBirth: guestDateOfBirth },
    ...additionalGuests.slice(0, Math.max(0, guestsCount - 1)),
  ];

  const changeGuestCount = (count: number) => {
    setGuestsCount(count);
    setAdditionalGuests((current) => Array.from(
      { length: Math.max(0, Math.min(count, 10) - 1) },
      (_, index) => current[index] || createAdditionalGuest()
    ));
  };

  const updateAdditionalGuest = (index: number, field: keyof AdditionalGuest, value: string) => {
    setAdditionalGuests((current) => current.map((guest, guestIndex) =>
      guestIndex === index ? { ...guest, [field]: value } : guest
    ));
  };

  const selectRoom = (room: any) => {
    setSelectedRoomId(room?.id || "");
    const firstAvailableBed = room?.beds?.find((bed: any) => bed.status === "AVAILABLE");
    setSelectedBedId(firstAvailableBed?.id || "");
    const maxGuests = firstAvailableBed?.tier === "DOUBLE" ? 2 : 1;
    if (guestsCount > maxGuests) {
      changeGuestCount(maxGuests);
      setGuestCountInput(String(maxGuests));
    }
  };

  const validateGuestDetails = () => {
    if (allGuestDetails.length !== guestsCount) return "Enter details for every guest.";
    for (let index = 0; index < allGuestDetails.length; index++) {
      const guest = allGuestDetails[index];
      const label = index === 0 ? "Primary guest" : `Guest ${index + 1}`;
      if (!guest.name.trim()) return `${label}: name is required.`;
      if (!/^\d{10}$/.test(guest.phone)) return `${label}: enter a valid 10-digit mobile number.`;
      if (guest.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email)) return `${label}: enter a valid email address.`;
      if (guest.dateOfBirth && guest.dateOfBirth > todayStr) return `${label}: date of birth cannot be in the future.`;
    }
    return "";
  };

  const continueToNextStage = () => {
    setErrorMsg("");
    if (stage === 1) {
      if (!selectedHostelId || !selectedRoomId || !selectedBedId) {
        setErrorMsg("Choose a hostel, room, and available bed to continue.");
        return;
      }
      if (!checkIn || !effectiveCheckOut || new Date(effectiveCheckOut) <= new Date(checkIn)) {
        setErrorMsg("Choose a valid check-in and check-out date range.");
        return;
      }
    }
    if (stage === 2) {
      if (!/^(?:[1-9]|10)$/.test(guestCountInput) || !Number.isInteger(guestsCount) || guestsCount < 1 || guestsCount > maxGuestsForSelectedBed) {
        setErrorMsg(`This selected bed can accommodate up to ${maxGuestsForSelectedBed} guest${maxGuestsForSelectedBed === 1 ? "" : "s"}. Select a Double bed for two guests.`);
        return;
      }
      const guestError = validateGuestDetails();
      if (guestError) {
        setErrorMsg(guestError);
        return;
      }
    }
    setStage((current) => Math.min(3, current + 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBedId) {
      setErrorMsg("Please enter guest name, phone, and select a bed.");
      return;
    }
    const guestError = validateGuestDetails();
    if (guestError) {
      setStage(2);
      setErrorMsg(guestError);
      return;
    }
    if (advanceAmount < 0 || advanceAmount > finalAmount) {
      setErrorMsg("Advance must be between ₹0 and the booking total.");
      return;
    }
    if (remainingAmount > 0 && !dueDate) {
      setErrorMsg("Set a due date for the remaining balance.");
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
          guestsCount,
          guestDetails: allGuestDetails,
          hostelId: selectedHostelId,
          roomId: selectedRoomId,
          bedId: selectedBedId,
          checkInDate: checkIn,
          checkOutDate: stayType === "MONTHLY" ? null : effectiveCheckOut,
          stayType,
          totalAmount: finalAmount,
          customTotalAmount: priceOverride > 0 ? priceOverride : null,
          advanceAmount,
          dueDate: remainingAmount > 0 ? dueDate : null,
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
      setAdditionalGuests([]);
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
    <div className="glass-panel w-full max-w-none p-5 sm:p-6 rounded-3xl border border-slate-800 bg-[#111827]/85 space-y-5">
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

      <div className="relative px-2 pt-1">
        <div className="absolute left-[16.67%] right-[16.67%] top-[14px] h-0.5 rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-indigo-400 transition-all duration-300" style={{ width: `${((stage - 1) / 2) * 100}%` }} />
        </div>
        <div className="relative grid grid-cols-3">
          {["Room & stay", "Guest", "Payment"].map((label, index) => {
            const step = index + 1;
            const isActive = stage === step;
            const isComplete = stage > step;
            return (
              <div key={label} className={`flex flex-col items-center gap-2 text-center text-xs ${isActive ? "text-white" : isComplete ? "text-indigo-200" : "text-slate-500"}`} aria-current={isActive ? "step" : undefined}>
                <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold transition-colors ${isActive ? "border-indigo-300 bg-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.35)]" : isComplete ? "border-indigo-400 bg-indigo-500 text-white" : "border-slate-700 bg-[#111827] text-slate-500"}`}>{isComplete ? "✓" : step}</span>
                <span className={`font-semibold ${isActive ? "" : "font-medium"}`}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {stage === 1 && <div className="space-y-5">
        {/* Property and four-step room assignment */}
        <div className="space-y-4 p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
              Hostel Property
            </label>
            <CustomSelect
              value={selectedHostelId}
              onValueChange={(value) => {
                setSelectedHostelId(value);
                const h = hostels.find((item) => item.id === value);
                const firstRoom = h?.rooms?.[0];
                if (firstRoom) {
                  setSelectedRoomTypeId(firstRoom.roomTypeId);
                  setSelectedFloor(String(firstRoom.floor));
                  selectRoom(firstRoom);
                } else {
                  setSelectedRoomTypeId("");
                  setSelectedFloor("");
                  setSelectedRoomId("");
                  setSelectedBedId("");
                }
              }}
              options={hostels.map((h) => ({ value: h.id, label: `${h.name} (${h.city})` }))}
              triggerClassName="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">Room Type</label>
              <CustomSelect
                value={selectedRoomTypeId}
                onValueChange={(value) => {
                  setSelectedRoomTypeId(value);
                  const typeRooms = rooms.filter((room: any) => room.roomTypeId === value);
                  const firstRoom = typeRooms[0];
                  setSelectedFloor(firstRoom ? String(firstRoom.floor) : "");
                  selectRoom(firstRoom);
                }}
                options={roomTypes.map((type: any) => ({ value: type.id, label: type.name }))}
                triggerClassName="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">Floor</label>
              <CustomSelect
                value={selectedFloor}
                onValueChange={(value) => {
                  setSelectedFloor(value);
                  selectRoom(roomsForType.find((room: any) => String(room.floor) === value));
                }}
                options={floorsForType.map((floor) => ({ value: floor, label: `Floor ${floor}` }))}
                triggerClassName="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">Room Number</label>
              <CustomSelect
                value={activeRoom?.id || ""}
                onValueChange={(value) => selectRoom(roomsForFloor.find((room: any) => room.id === value))}
                options={roomsForFloor.map((room: any) => ({ value: room.id, label: `${room.roomNumber} · ${room.isAC ? "AC" : "Non-AC"}` }))}
                triggerClassName="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">Bed</label>
              <CustomSelect
                value={selectedBedId}
                onValueChange={(value) => {
                  setSelectedBedId(value);
                  const bed = availableBeds.find((item: any) => item.id === value);
                  const maxGuests = bed?.tier === "DOUBLE" ? 2 : 1;
                  if (guestsCount > maxGuests) {
                    changeGuestCount(maxGuests);
                    setGuestCountInput(String(maxGuests));
                  }
                }}
                options={availableBeds.length === 0
                  ? [{ value: "", label: "No beds in this room", disabled: true }]
                  : availableBeds.map((bed: any) => ({
                      value: bed.id,
                      label: `${bed.bedNumber} (${bed.tier?.replace("_", " ")}${bed.status !== "AVAILABLE" ? ` • ${bed.status}` : " • Vacant"})`,
                      disabled: bed.status !== "AVAILABLE",
                    }))}
                triggerClassName="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-emerald-400"
              />
            </div>
          </div>

          <p className="text-xs text-slate-400">
            {activeRoom ? `${SHARING_NAMES[activeRoom.capacity] || `${activeRoom.capacity}-Share`} · ${activeRoom.isAC ? "AC" : "Non-AC"} · ${availableBeds.filter((bed: any) => bed.status === "AVAILABLE").length} beds available` : "Select a room type, floor, and room number to choose a bed."}
          </p>
        </div>

        {/* Offline & Backdated Helper Notice */}
        <div className="px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
          <span><strong>Offline booking:</strong> Past check-in dates are supported. Current stays can be checked in automatically.</span>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-indigo-400">Stay type</label>
            <CustomSelect value={stayType} onValueChange={(value) => setStayType(value as "DAILY" | "MONTHLY")} options={[{ value: "DAILY", label: "Daily / short stay" }, { value: "MONTHLY", label: "Monthly · month-to-month" }]} triggerClassName="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs" />
            <p className="mt-1 text-[11px] text-slate-500">Monthly stays use this room category’s configured maintenance fee and refundable security deposit. Checkout is recorded when notice is processed.</p>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
              Check-In Date
            </label>
            <DatePicker value={checkIn} onChange={setCheckIn} triggerClassName="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
              Check-Out Date
            </label>
            {stayType === "DAILY" ? <DatePicker value={checkOut} onChange={setCheckOut} min={checkIn} triggerClassName="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs" /> : <div className="rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs font-semibold text-indigo-200">Month-to-month · no planned checkout</div>}
          </div>
        </div>
        </div>}

        {/* Guest Information */}
        {stage === 2 && <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
              Guest Name *
            </label>
            <input
              type="text"
              required
              maxLength={100}
              placeholder="e.g. Sameer Kulkarni"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">Number of Guests *</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="(?:[1-9]|10)"
              maxLength={2}
              required
              value={guestCountInput}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
                if (!digits) return;
                const count = Math.min(10, Number(digits));
                if (count > maxGuestsForSelectedBed) {
                  setGuestCountInput(String(maxGuestsForSelectedBed));
                  changeGuestCount(maxGuestsForSelectedBed);
                  setErrorMsg(`This selected bed can accommodate up to ${maxGuestsForSelectedBed} guest${maxGuestsForSelectedBed === 1 ? "" : "s"}. Select a Double bed for two guests.`);
                  return;
                }
                setGuestCountInput(digits);
                if (count >= 1) {
                  setGuestCountInput(String(count));
                  changeGuestCount(count);
                }
              }}
              onBlur={() => {
                if (!guestCountInput || Number(guestCountInput) < 1) setGuestCountInput(String(guestsCount));
              }}
              aria-describedby="guest-count-hint"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-xs text-white focus:outline-none"
            />
            <span id="guest-count-hint" className="mt-1 block text-[10px] text-slate-500">This {selectedBed?.tier === "DOUBLE" ? "Double bed can accommodate up to 2 guests" : "bed accommodates 1 guest"}. Select a Double bed to register two people together.</span>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
              Mobile Number *
            </label>
            <input
              type="tel"
              required
              inputMode="numeric"
              maxLength={10}
              pattern="[0-9]{10}"
              title="Enter exactly 10 digits"
              placeholder="98765 43210"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
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
            <CustomSelect value={guestGender} onValueChange={setGuestGender} options={[{ value: "MALE", label: "Male" }, { value: "FEMALE", label: "Female" }, { value: "OTHER", label: "Other" }]} triggerClassName="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
              Date of Birth (Optional)
            </label>
            <DatePicker value={guestDateOfBirth} onChange={setGuestDateOfBirth} triggerClassName="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs" />
          </div>

        </div>
        {guestsCount > 1 && (
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white">Additional guest details</h4>
            {additionalGuests.slice(0, guestsCount - 1).map((guest, index) => (
              <section key={index} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-300">Guest {index + 2}</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <label className="text-xs text-slate-400">Full name *<input required maxLength={100} value={guest.name} onChange={(e) => updateAdditionalGuest(index, "name", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-white" /></label>
                  <label className="text-xs text-slate-400">Mobile number *<input required type="tel" inputMode="numeric" maxLength={10} pattern="[0-9]{10}" title="Enter exactly 10 digits" placeholder="98765 43210" value={guest.phone} onChange={(e) => updateAdditionalGuest(index, "phone", e.target.value.replace(/\D/g, "").slice(0, 10))} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-white" /></label>
                  <label className="text-xs text-slate-400">Email (optional)<input type="email" maxLength={254} value={guest.email} onChange={(e) => updateAdditionalGuest(index, "email", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-white" /></label>
                  <label className="text-xs text-slate-400">Government ID (optional)<input maxLength={100} value={guest.govtId} onChange={(e) => updateAdditionalGuest(index, "govtId", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-white" /></label>
                  <label className="text-xs text-slate-400">Gender<CustomSelect value={guest.gender} onValueChange={(value) => updateAdditionalGuest(index, "gender", value)} options={[{ value: "MALE", label: "Male" }, { value: "FEMALE", label: "Female" }, { value: "OTHER", label: "Other" }]} triggerClassName="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-xs" /></label>
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Date of birth (optional)</label>
                    <DatePicker value={guest.dateOfBirth} onChange={(value) => updateAdditionalGuest(index, "dateOfBirth", value)} triggerClassName="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs" />
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
        </div>}

        {/* Payment stage: total, amount collected, then remaining balance */}
        {stage === 3 && <div className="space-y-4">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs">
            <h4 className="font-bold uppercase tracking-wider text-indigo-300">Reservation review</h4>
            <div className="mt-2 grid grid-cols-1 gap-1.5 text-slate-300 sm:grid-cols-2 lg:grid-cols-3">
              <div>{activeHostel?.name} · {activeRoom?.roomType?.name} · Room {activeRoom?.roomNumber}</div>
              <div>Floor {activeRoom?.floor} · {SHARING_NAMES[activeRoom?.capacity] || `${activeRoom?.capacity}-Share`} · Bed {availableBeds.find((bed: any) => bed.id === selectedBedId)?.bedNumber}</div>
              <div>{stayType === "MONTHLY" ? "Monthly · month-to-month" : "Daily / short stay"} · Check-in {checkIn}{stayType === "DAILY" ? ` · Check-out ${effectiveCheckOut}` : " · no planned checkout"} · {guestsCount} guest{guestsCount === 1 ? "" : "s"}</div>
              <div className="font-semibold text-white">Primary guest: {guestName} · {guestPhone}</div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-300">1. Booking total</div>
              <div className="mt-2 text-2xl font-black text-white">₹{finalAmount.toLocaleString("en-IN")}</div>
              {calculatedPricing && <div className="mt-3 space-y-1 border-t border-slate-800 pt-3 text-xs text-slate-300">
                <div className="flex justify-between"><span>Stay rent</span><span>₹{calculatedPricing.baseAmount.toLocaleString("en-IN")}</span></div>
                {calculatedPricing.serviceFee > 0 && <div className="flex justify-between"><span>{calculatedPricing.stayType === "MONTHLY" ? "Monthly maintenance" : "Service fee"}</span><span>₹{calculatedPricing.serviceFee.toLocaleString("en-IN")}</span></div>}
                {calculatedPricing.securityDeposit > 0 && <div className="flex justify-between"><span>Refundable security deposit</span><span>₹{calculatedPricing.securityDeposit.toLocaleString("en-IN")}</span></div>}
                <div className="flex justify-between border-t border-slate-800 pt-1 font-bold text-white"><span>Calculated total</span><span>₹{calculatedPricing.totalAmount.toLocaleString("en-IN")}</span></div>
              </div>}
              <label className="mt-3 block text-xs font-semibold text-slate-300">Agreed total (₹, optional)
                <input type="text" inputMode="numeric" maxLength={9} placeholder={`Calculated total: ₹${suggestedPrice.toLocaleString("en-IN")}`} value={priceOverride || ""} onChange={(e) => setPriceOverride(Number(e.target.value.replace(/\D/g, "").slice(0, 9)))} className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-sm text-white placeholder:text-slate-500" />
              </label>
              <p className="mt-1.5 text-[11px] text-slate-500">Leave blank to use the calculated total. A custom total includes all listed charges.</p>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-300">2. Payment received now</div>
              <label className="mt-2 block text-xs font-semibold text-slate-300">Amount collected (₹)
                <input type="text" inputMode="numeric" maxLength={9} placeholder="0" value={advanceAmount || ""} onChange={(e) => setAdvanceAmount(Number(e.target.value.replace(/\D/g, "").slice(0, 9)))} aria-invalid={advanceAmount > finalAmount} className={`mt-1 block w-full rounded-xl border bg-slate-950 p-2.5 text-sm text-white placeholder:text-slate-500 ${advanceAmount > finalAmount ? "border-rose-500" : "border-slate-700"}`} />
              </label>
              <p className="mt-1.5 text-[11px] text-slate-500">Enter only the amount received at the desk today.</p>
              {advanceAmount > finalAmount && <p className="mt-1 text-xs text-rose-300" role="alert">Amount received cannot be greater than the booking total.</p>}
              {advanceAmount > 0 && <div className="mt-3">
                <label className="mb-1 block text-xs font-semibold text-slate-300">Method used for this payment</label>
                <CustomSelect value={paymentMethod} onValueChange={setPaymentMethod} options={[{ value: "cash", label: "Cash at Reception" }, { value: "upi", label: "UPI / QR Code" }, { value: "card", label: "Credit / Debit Card" }, { value: "bank_transfer", label: "Direct Bank Transfer" }, { value: "offline_prepaid", label: "Pre-Platform / Offline Paid" }]} triggerClassName="p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-semibold" />
              </div>}
            </section>
          </div>

          <section className={`rounded-2xl border p-4 ${remainingAmount > 0 ? "border-amber-500/30 bg-amber-500/5" : "border-emerald-500/30 bg-emerald-500/5"}`}>
            {remainingAmount > 0 ? <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-200">3. Remaining balance</div>
                <div className="mt-1 text-2xl font-black text-amber-300">₹{remainingAmount.toLocaleString("en-IN")}</div>
                <p className="mt-1 text-[11px] text-slate-400">Set the date the guest agreed to pay this balance.</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">Balance due date *</label>
                <DatePicker value={dueDate} onChange={setDueDate} min={todayStr} triggerClassName="p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs" />
              </div>
            </div> : <div className="text-sm font-semibold text-emerald-200">Fully paid · No balance due</div>}
          </section>

          <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-200">
            <input type="checkbox" checked={autoCheckIn} onChange={(e) => setAutoCheckIn(e.target.checked)} className="mt-0.5 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500" />
            <span><strong>Check in now</strong><span className="mt-0.5 block text-slate-400">Mark the bed as occupied immediately.</span></span>
          </label>
        </div>}

        <div className="flex justify-between border-t border-slate-800 pt-4">
          <Button type="button" variant="outline" size="md" disabled={stage === 1 || isSubmitting} onClick={() => { setErrorMsg(""); setStage((current) => Math.max(1, current - 1)); }}>Back</Button>
          {stage < 3 ? <Button type="button" variant="glow" size="lg" onClick={continueToNextStage}>Continue</Button> : <Button type="submit" variant="glow" size="lg" isLoading={isSubmitting} rightIcon={<UserPlus className="w-4 h-4" />}>Create Walk-In & Issue Keycard</Button>}
        </div>
      </form>
    </div>
  );
};

export default WalkInClient;
