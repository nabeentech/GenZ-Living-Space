"use client";

import React, { useEffect, useState, useMemo } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import CustomSelect from "@/components/ui/CustomSelect";
import { getRoomTypePriceRates } from "@/lib/pricing";
import {
  ArrowRight,
  BedDouble,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Calendar,
  CreditCard,
  RefreshCw,
} from "lucide-react";

interface ShiftRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string | null;
  onSuccess?: (updatedBooking: any) => void;
}

export const ShiftRoomModal: React.FC<ShiftRoomModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [data, setData] = useState<any | null>(null);

  // Filters & Selection
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>("ALL");
  const [selectedFloor, setSelectedFloor] = useState<string>("ALL");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [selectedBedId, setSelectedBedId] = useState<string>("");

  // Financial overrides & settlement
  const [customAdjustment, setCustomAdjustment] = useState<string>("");
  const [settlementType, setSettlementType] = useState<string>("ADD_TO_BALANCE");
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [adminNotes, setAdminNotes] = useState<string>("");

  useEffect(() => {
    if (!isOpen || !bookingId) {
      setData(null);
      setErrorMsg("");
      setSelectedRoomId("");
      setSelectedBedId("");
      setCustomAdjustment("");
      return;
    }

    let isMounted = true;
    setLoading(true);
    setErrorMsg("");

    fetch(`/api/admin/bookings/${bookingId}/shift-room`)
      .then((res) => res.json())
      .then((res) => {
        if (!isMounted) return;
        if (!res.success) {
          setErrorMsg(res.message || "Failed to load shift room data.");
        } else {
          setData(res.data);
          // Set initial filters to match current room type if possible
          if (res.data?.booking?.room?.roomTypeId) {
            setSelectedRoomTypeId("ALL");
          }
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setErrorMsg(err.message || "Network error loading shift options.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, bookingId]);

  const booking = data?.booking;
  const currentRoom = booking?.room;
  const currentBed = booking?.bed;
  const currentRoomType = currentRoom?.roomType;

  // Compute remaining days in stay/cycle
  const { totalNights, daysElapsed, remainingDays } = useMemo(() => {
    if (!booking) return { totalNights: 1, daysElapsed: 0, remainingDays: 1 };
    const checkIn = new Date(booking.checkInDate).getTime();
    const checkOut = new Date(booking.checkOutDate).getTime();
    const now = new Date().getTime();

    const nights = Math.max(1, Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)));
    const elapsed = now <= checkIn ? 0 : Math.min(nights, Math.floor((now - checkIn) / (1000 * 60 * 60 * 24)));
    const rem = Math.max(1, nights - elapsed);

    return { totalNights: nights, daysElapsed: elapsed, remainingDays: rem };
  }, [booking]);

  // Current rate calculation
  const oldRates = useMemo(() => {
    if (!currentRoomType) return { daily: 0, days30: 0 };
    return getRoomTypePriceRates(currentRoomType, Boolean(currentRoom?.isAC));
  }, [currentRoomType, currentRoom]);

  const oldDailyRate = useMemo(() => {
    if (!booking) return 0;
    if (booking.stayType === "MONTHLY") {
      const monthly = oldRates.days30 || booking.baseAmount;
      return Math.round(monthly / 30);
    }
    return Math.round(oldRates.daily || booking.baseAmount / totalNights);
  }, [booking, oldRates, totalNights]);

  // Filter available rooms
  const filteredRooms = useMemo(() => {
    if (!data?.rooms) return [];
    return data.rooms.filter((r: any) => {
      // Must have at least 1 available bed (excluding current bed)
      const hasAvailableBeds = r.beds?.some((b: any) => b.status === "AVAILABLE" && b.id !== currentBed?.id);
      if (!hasAvailableBeds) return false;

      if (selectedRoomTypeId !== "ALL" && r.roomTypeId !== selectedRoomTypeId) return false;
      if (selectedFloor !== "ALL" && String(r.floor) !== selectedFloor) return false;
      return true;
    });
  }, [data?.rooms, selectedRoomTypeId, selectedFloor, currentBed]);

  // Available beds in currently selected target room
  const availableBedsInRoom = useMemo(() => {
    if (!selectedRoomId || !data?.rooms) return [];
    const r = data.rooms.find((rm: any) => rm.id === selectedRoomId);
    if (!r) return [];
    return r.beds.filter((b: any) => b.status === "AVAILABLE" && b.id !== currentBed?.id);
  }, [selectedRoomId, data?.rooms, currentBed]);

  // Selected target room and bed objects
  const targetRoom = useMemo(() => {
    if (!selectedRoomId || !data?.rooms) return null;
    return data.rooms.find((r: any) => r.id === selectedRoomId) || null;
  }, [selectedRoomId, data?.rooms]);

  const targetBed = useMemo(() => {
    if (!selectedBedId || !availableBedsInRoom) return null;
    return availableBedsInRoom.find((b: any) => b.id === selectedBedId) || null;
  }, [selectedBedId, availableBedsInRoom]);

  // Target rates calculation
  const targetRates = useMemo(() => {
    if (!targetRoom?.roomType) return null;
    return getRoomTypePriceRates(targetRoom.roomType, Boolean(targetRoom.isAC));
  }, [targetRoom]);

  const newDailyRate = useMemo(() => {
    if (!targetRates || !booking) return 0;
    if (booking.stayType === "MONTHLY") {
      return Math.round((targetRates.days30 || targetRates.daily * 30) / 30);
    }
    return Math.round(targetRates.daily);
  }, [targetRates, booking]);

  // Financial calculation: price diff & security deposit diff
  const { calculatedPriceDiff, calculatedDepositDiff, autoAdjustment } = useMemo(() => {
    if (!targetRoom || !targetBed || !booking) {
      return { calculatedPriceDiff: 0, calculatedDepositDiff: 0, autoAdjustment: 0 };
    }

    const priceDiffPerDay = newDailyRate - oldDailyRate;
    const priceDiff = Math.round(priceDiffPerDay * remainingDays);

    let depositDiff = 0;
    if (booking.stayType === "MONTHLY") {
      const oldDep = currentRoomType?.securityDeposit ?? 0;
      const newDep = targetRoom.roomType?.securityDeposit ?? 0;
      depositDiff = Math.max(0, newDep - oldDep);
    }

    return {
      calculatedPriceDiff: priceDiff,
      calculatedDepositDiff: depositDiff,
      autoAdjustment: priceDiff + depositDiff,
    };
  }, [targetRoom, targetBed, booking, newDailyRate, oldDailyRate, remainingDays, currentRoomType]);

  // Sync custom adjustment with auto-calculated adjustment whenever target changes
  useEffect(() => {
    setCustomAdjustment(String(autoAdjustment));
    if (autoAdjustment > 0) {
      setSettlementType("ADD_TO_BALANCE");
    } else if (autoAdjustment < 0) {
      setSettlementType("DEDUCT_BALANCE");
    } else {
      setSettlementType("NO_ADJUSTMENT");
    }
  }, [autoAdjustment]);

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
    setSelectedBedId("");
    // Auto-select first available bed if any
    const r = data?.rooms?.find((rm: any) => rm.id === roomId);
    const firstAvail = r?.beds?.find((b: any) => b.status === "AVAILABLE" && b.id !== currentBed?.id);
    if (firstAvail) {
      setSelectedBedId(firstAvail.id);
    }
  };

  const handleConfirmShift = async () => {
    if (!bookingId || !selectedBedId) return;
    setSubmitting(true);
    setErrorMsg("");

    const parsedAdj = Number(customAdjustment);

    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/shift-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetBedId: selectedBedId,
          adjustmentAmount: isNaN(parsedAdj) ? autoAdjustment : parsedAdj,
          depositAdjustment: calculatedDepositDiff,
          settlementType,
          paymentMethod,
          notes: adminNotes,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to shift room.");
      }

      if (onSuccess) {
        onSuccess(json.data);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred while shifting the resident.");
    } finally {
      setSubmitting(false);
    }
  };

  const isUpgrade = autoAdjustment > 0;
  const isDowngrade = autoAdjustment < 0;
  const isLateral = autoAdjustment === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? () => {} : onClose}
      maxWidth="2xl"
      title="🔄 Shift Room & Bed"
      description={booking ? `${booking.guestName} · #${booking.bookingReference}` : "Transfer resident"}
    >
      {loading ? (
        <div className="p-8 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
          <p className="text-sm text-slate-400 font-medium">Loading property rooms and rates...</p>
        </div>
      ) : errorMsg && !data ? (
        <div className="p-6 text-center space-y-4">
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
            {errorMsg}
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      ) : booking ? (
        <div className="space-y-5 py-1 text-slate-200 min-h-[440px] flex flex-col justify-between">
          <div className="space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Current Stay Banner */}
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Current Accommodation</span>
              <Badge variant="indigo" size="sm">
                {booking.stayType} STAY
              </Badge>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-base font-bold text-white">
                  Room {currentRoom?.roomNumber} · {currentBed?.bedNumber}
                </h4>
                <p className="text-xs text-indigo-300">
                  {currentRoomType?.name} {currentRoom?.isAC ? "(AC)" : "(Non-AC)"} · Floor {currentRoom?.floor}
                </p>
              </div>
              <div className="text-right text-xs">
                <span className="text-slate-400 block">Rate / day:</span>
                <span className="font-bold text-white text-sm">₹{oldDailyRate.toLocaleString("en-IN")}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                {new Date(booking.checkInDate).toLocaleDateString()} → {new Date(booking.checkOutDate).toLocaleDateString()}
              </span>
              <span className="font-bold text-amber-300">
                {remainingDays} of {totalNights} days remaining
              </span>
            </div>
          </div>

          {/* Step 1: Destination Selection */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block">
              1. Select Destination Room & Bed
            </span>

            {/* Filters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Filter by Room Type</label>
                <CustomSelect
                  value={selectedRoomTypeId}
                  onValueChange={(val) => {
                    setSelectedRoomTypeId(val);
                    setSelectedRoomId("");
                    setSelectedBedId("");
                  }}
                  options={[
                    { value: "ALL", label: "All Room Types" },
                    ...(data?.roomTypes || []).map((rt: any) => ({
                      value: rt.id,
                      label: rt.name,
                    })),
                  ]}
                  triggerClassName="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Filter by Floor</label>
                <CustomSelect
                  value={selectedFloor}
                  onValueChange={(val) => {
                    setSelectedFloor(val);
                    setSelectedRoomId("");
                    setSelectedBedId("");
                  }}
                  options={[
                    { value: "ALL", label: "All Floors" },
                    { value: "1", label: "Floor 1" },
                    { value: "2", label: "Floor 2" },
                    { value: "3", label: "Floor 3" },
                    { value: "4", label: "Floor 4" },
                  ]}
                  triggerClassName="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs"
                />
              </div>
            </div>

            {/* Room Picker */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Target Room</label>
              {filteredRooms.length === 0 ? (
                <div className="p-3 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                  No rooms with available beds match the current filter.
                </div>
              ) : (
                <CustomSelect
                  value={selectedRoomId}
                  onValueChange={handleRoomSelect}
                  options={[
                    ...(selectedRoomId ? [] : [{ value: "", label: "Select destination room..." }]),
                    ...filteredRooms.map((r: any) => {
                      const availCount = r.beds.filter((b: any) => b.status === "AVAILABLE" && b.id !== currentBed?.id).length;
                      return {
                        value: r.id,
                        label: `Room ${r.roomNumber} (${r.roomType?.name || "Standard"}, ${r.isAC ? "AC" : "Non-AC"}) · Floor ${r.floor} · [${availCount} Bed${availCount > 1 ? "s" : ""} Free]`,
                      };
                    }),
                  ]}
                  triggerClassName="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs"
                />
              )}
            </div>

            {/* Bed Picker */}
            {selectedRoomId && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Target Bed</label>
                <div className="flex flex-wrap gap-2">
                  {availableBedsInRoom.map((b: any) => {
                    const isSelected = selectedBedId === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBedId(b.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-400 shadow-glow"
                            : "bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-500 hover:text-white"
                        }`}
                      >
                        <BedDouble className="w-3.5 h-3.5" />
                        <span>{b.bedNumber}</span>
                        {isSelected && <CheckCircle2 className="w-3 h-3 text-emerald-300 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Financial Live Preview */}
          {targetBed && targetRoom ? (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block">
                2. Financial Summary (Live Proration)
              </span>

              <div className="p-4 rounded-2xl border border-slate-800 bg-[#101626]/80 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Current Room Rate:</span>
                  <span className="font-semibold text-slate-200">₹{oldDailyRate}/day</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>New Room Rate:</span>
                  <span className="font-semibold text-white">
                    ₹{newDailyRate}/day{" "}
                    <span className={newDailyRate >= oldDailyRate ? "text-amber-300" : "text-emerald-300"}>
                      ({newDailyRate >= oldDailyRate ? `+₹${newDailyRate - oldDailyRate}` : `-₹${oldDailyRate - newDailyRate}`}/day)
                    </span>
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Days Remaining Adjusted:</span>
                  <span className="font-semibold text-slate-200">{remainingDays} days</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Prorated Price Difference:</span>
                  <span className={`font-bold ${calculatedPriceDiff >= 0 ? "text-amber-300" : "text-emerald-300"}`}>
                    {calculatedPriceDiff >= 0 ? `+₹${calculatedPriceDiff.toLocaleString("en-IN")}` : `−₹${Math.abs(calculatedPriceDiff).toLocaleString("en-IN")}`}
                  </span>
                </div>
                {calculatedDepositDiff > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Deposit Difference:</span>
                    <span className="font-bold text-amber-300">+₹{calculatedDepositDiff.toLocaleString("en-IN")}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between text-sm">
                  <span className="font-bold text-white">Total Adjustment:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-400">₹</span>
                    <input
                      type="number"
                      value={customAdjustment}
                      onChange={(e) => setCustomAdjustment(e.target.value)}
                      className="w-24 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-right font-black text-white text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Settlement Strategy */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block">
                  3. Settlement Option
                </span>

                {isUpgrade && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="settlement"
                        value="ADD_TO_BALANCE"
                        checked={settlementType === "ADD_TO_BALANCE"}
                        onChange={() => setSettlementType("ADD_TO_BALANCE")}
                        className="text-indigo-600 focus:ring-0"
                      />
                      <div>
                        <span className="font-bold text-white block">Add to Pending Balance (Pay Later)</span>
                        <span className="text-[11px] text-slate-400">Updates guest's due balance; generates due invoice.</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="settlement"
                        value="COLLECT_NOW"
                        checked={settlementType === "COLLECT_NOW"}
                        onChange={() => setSettlementType("COLLECT_NOW")}
                        className="text-indigo-600 focus:ring-0"
                      />
                      <div className="flex-1">
                        <span className="font-bold text-white block">Collect Now at Reception</span>
                        <span className="text-[11px] text-slate-400">Guest pays difference immediately; generates receipt.</span>
                      </div>
                    </label>

                    {settlementType === "COLLECT_NOW" && (
                      <div className="ml-6 pl-2 border-l border-indigo-500/30">
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Payment Method</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                        >
                          <option value="CASH">Cash</option>
                          <option value="UPI">UPI / QR Code</option>
                          <option value="CARD">Debit / Credit Card</option>
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                        </select>
                      </div>
                    )}

                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="settlement"
                        value="WAIVE"
                        checked={settlementType === "WAIVE"}
                        onChange={() => {
                          setSettlementType("WAIVE");
                          setCustomAdjustment("0");
                        }}
                        className="text-indigo-600 focus:ring-0"
                      />
                      <div>
                        <span className="font-bold text-white block">Waive / Courtesy (Free Upgrade)</span>
                        <span className="text-[11px] text-slate-400">Owner courtesy move without additional charge.</span>
                      </div>
                    </label>
                  </div>
                )}

                {isDowngrade && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="settlement"
                        value="DEDUCT_BALANCE"
                        checked={settlementType === "DEDUCT_BALANCE"}
                        onChange={() => setSettlementType("DEDUCT_BALANCE")}
                        className="text-indigo-600 focus:ring-0"
                      />
                      <div>
                        <span className="font-bold text-white block">Deduct from Pending Balance</span>
                        <span className="text-[11px] text-slate-400">Reduces guest's outstanding balance for this stay.</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="settlement"
                        value="CREDIT_NEXT_RENT"
                        checked={settlementType === "CREDIT_NEXT_RENT"}
                        onChange={() => setSettlementType("CREDIT_NEXT_RENT")}
                        className="text-indigo-600 focus:ring-0"
                      />
                      <div>
                        <span className="font-bold text-white block">Adjust / Carry Forward to Next Rent</span>
                        <span className="text-[11px] text-slate-400">Credit will apply towards next month's renewal invoice.</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="settlement"
                        value="REFUND_NOW"
                        checked={settlementType === "REFUND_NOW"}
                        onChange={() => setSettlementType("REFUND_NOW")}
                        className="text-indigo-600 focus:ring-0"
                      />
                      <div>
                        <span className="font-bold text-white block">Refund Excess Amount</span>
                        <span className="text-[11px] text-slate-400">Log immediate cash/UPI refund to guest.</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="settlement"
                        value="NO_ADJUSTMENT"
                        checked={settlementType === "NO_ADJUSTMENT"}
                        onChange={() => {
                          setSettlementType("NO_ADJUSTMENT");
                          setCustomAdjustment("0");
                        }}
                        className="text-indigo-600 focus:ring-0"
                      />
                      <div>
                        <span className="font-bold text-white block">Keep Current Price (No Refund)</span>
                        <span className="text-[11px] text-slate-400">Hostel policy: mid-stay downgrades are non-refundable.</span>
                      </div>
                    </label>
                  </div>
                )}

                {isLateral && (
                  <div className="p-3 bg-indigo-950/40 border border-indigo-500/20 rounded-xl text-xs text-indigo-300">
                    Lateral move to same room category: ₹0 adjustment. Old bed will be sent to cleaning.
                  </div>
                )}
              </div>

              {/* Shift Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Staff Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Guest requested upper floor with balcony"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500"
                />
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 text-center space-y-2 my-2">
              <BedDouble className="w-7 h-7 text-indigo-400/50 mx-auto" />
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Select a destination room and bed above to calculate the prorated price difference and choose settlement options.
              </p>
            </div>
          )}
        </div>

        {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="glow"
              size="sm"
              disabled={!selectedBedId || submitting}
              isLoading={submitting}
              onClick={handleConfirmShift}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Confirm Room Shift
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
};

export default ShiftRoomModal;
