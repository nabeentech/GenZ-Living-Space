"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import {
  Calendar,
  MapPin,
  Users,
  Bed as BedIcon,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Tag,
  CheckCircle2,
  Lock,
  Clock,
  CreditCard,
  QrCode,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { calculateBookingPrice } from "@/lib/pricing";

export const BookClient: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(1);
  // 1: Stay & Room, 2: Bed Selection, 3: Guest Details & Coupons, 4: Payment Hold & Checkout

  const [hostels, setHostels] = useState<any[]>([]);
  const [selectedHostelSlug, setSelectedHostelSlug] = useState(
    searchParams.get("hostel") || "madhapur-01-hyd"
  );

  const todayStr = new Date().toISOString().split("T")[0];
  const defaultOut = new Date();
  defaultOut.setDate(defaultOut.getDate() + 3);
  const defaultOutStr = defaultOut.toISOString().split("T")[0];

  const [checkIn, setCheckIn] = useState(
    searchParams.get("checkIn") || todayStr
  );
  const [checkOut, setCheckOut] = useState(
    searchParams.get("checkOut") || defaultOutStr
  );
  const [guests, setGuests] = useState(
    Number(searchParams.get("guests")) || 1
  );

  // Selected Room & Bed
  const [roomsData, setRoomsData] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [selectedBedId, setSelectedBedId] = useState<string>("");
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  // Room Filters
  const [filterSharingType, setFilterSharingType] = useState<"1" | "2" | "3" | "all">("all");
  const [filterAC, setFilterAC] = useState<"ac" | "non-ac" | "all">("all");

  // Guest Details
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestGender, setGuestGender] = useState("MALE");
  const [guestGovtId, setGuestGovtId] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  // Coupon
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState("");

  // Active Hold & Payment
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const [holdSecondsLeft, setHoldSecondsLeft] = useState<number>(15 * 60);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [showSimulatorModal, setShowSimulatorModal] = useState(false);
  const [simulatedMethod, setSimulatedMethod] = useState("upi");

  // Load Hostels on mount
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/hostels");
        const json = await res.json();
        if (json.success && json.data) {
          setHostels(json.data);
        }
      } catch (err) {
        console.error("Failed to load hostels:", err);
      }
    }
    loadData();
  }, []);

  const activeHostel = useMemo(
    () => hostels.find((h) => h.slug === selectedHostelSlug) || hostels[0],
    [hostels, selectedHostelSlug]
  );

  // Query Availability for selected hostel and dates
  useEffect(() => {
    if (!activeHostel) return;
    async function checkAvail() {
      setIsLoadingAvailability(true);
      try {
        const res = await fetch(
          `/api/availability?hostelId=${activeHostel.id}&checkIn=${checkIn}&checkOut=${checkOut}`
        );
        const json = await res.json();
        if (json.success && json.data?.rooms) {
          setRoomsData(json.data.rooms);
          if (json.data.rooms.length > 0 && !selectedRoomId) {
            const firstAvailable = json.data.rooms.find(
              (r: any) => r.hasAvailability
            );
            if (firstAvailable) {
              setSelectedRoomId(firstAvailable.id);
            } else {
              setSelectedRoomId(json.data.rooms[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching availability:", err);
      } finally {
        setIsLoadingAvailability(false);
      }
    }
    checkAvail();
  }, [activeHostel, checkIn, checkOut]);

  // Selected Room Object
  const selectedRoom = useMemo(
    () => roomsData.find((r) => r.id === selectedRoomId),
    [roomsData, selectedRoomId]
  );

  // Auto pick first available bed if room changes
  useEffect(() => {
    if (selectedRoom?.beds) {
      const avail = selectedRoom.beds.find((b: any) => b.isAvailable);
      if (avail) {
        setSelectedBedId(avail.id);
      } else {
        setSelectedBedId("");
      }
    }
  }, [selectedRoom]);

  const selectedBed = useMemo(
    () => selectedRoom?.beds?.find((b: any) => b.id === selectedBedId),
    [selectedRoom, selectedBedId]
  );

  // Filter rooms based on sharing type and AC preference
  const filteredAndGroupedRooms = useMemo(() => {
    let filtered = roomsData;

    // Filter by sharing type (capacity)
    if (filterSharingType !== "all") {
      const capacity = parseInt(filterSharingType);
      filtered = filtered.filter((r) => r.capacity === capacity);
    }

    // Filter by AC status
    if (filterAC !== "all") {
      filtered = filtered.filter((r) => {
        if (filterAC === "ac") return r.isAC === true;
        if (filterAC === "non-ac") return r.isAC === false;
        return true;
      });
    }

    // Group by room type
    const grouped: Record<string, any[]> = {};
    filtered.forEach((room) => {
      const key = room.roomType.name;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(room);
    });

    return grouped;
  }, [roomsData, filterSharingType, filterAC]);

  // Get display price for a room (handles tiered pricing based on duration)
  const getDisplayPrice = (room: any): { price: number; displayText: string; pricingInfo: string } => {
    const cIn = new Date(checkIn);
    const cOut = new Date(checkOut);
    
    if (isNaN(cIn.getTime()) || isNaN(cOut.getTime()) || cOut <= cIn) {
      const basePrice = room.roomType.pricePerDay || room.roomType.basePrice;
      return { 
        price: basePrice, 
        displayText: "/day", 
        pricingInfo: "1-Day Rate"
      };
    }
    
    const daysDiff = Math.ceil((cOut.getTime() - cIn.getTime()) / (1000 * 60 * 60 * 24));
    
    // Determine pricing tier based on number of days
    let price = room.roomType.basePrice;
    let displayText = "/day";
    let pricingInfo = "";
    
    if (daysDiff === 1) {
      price = room.roomType.pricePerDay || room.roomType.basePrice;
      displayText = "/day";
      pricingInfo = "1-DAY RATE";
    } else if (daysDiff >= 2 && daysDiff <= 6) {
      price = room.roomType.pricePerDay || room.roomType.basePrice;
      displayText = `/day (${daysDiff} days)`;
      pricingInfo = "DAILY RATE";
    } else if (daysDiff === 7) {
      price = room.roomType.price7Days || (room.roomType.pricePerDay || room.roomType.basePrice) * 7;
      displayText = "/week";
      pricingInfo = "1-WEEK RATE";
    } else if (daysDiff >= 8 && daysDiff <= 9) {
      price = room.roomType.pricePerDay || room.roomType.basePrice;
      displayText = `/day (${daysDiff} days)`;
      pricingInfo = "DAILY RATE";
    } else if (daysDiff === 10) {
      price = room.roomType.price10Days || (room.roomType.pricePerDay || room.roomType.basePrice) * 10;
      displayText = "/10 days";
      pricingInfo = "10-DAY RATE";
    } else if (daysDiff >= 11 && daysDiff <= 14) {
      price = room.roomType.pricePerDay || room.roomType.basePrice;
      displayText = `/day (${daysDiff} days)`;
      pricingInfo = "DAILY RATE";
    } else if (daysDiff === 15) {
      price = room.roomType.price15Days || (room.roomType.pricePerDay || room.roomType.basePrice) * 15;
      displayText = "/15 days";
      pricingInfo = "15-DAY RATE";
    } else if (daysDiff >= 16 && daysDiff <= 29) {
      price = room.roomType.pricePerDay || room.roomType.basePrice;
      displayText = `/day (${daysDiff} days)`;
      pricingInfo = "DAILY RATE";
    } else if (daysDiff >= 30) {
      price = room.roomType.price30Days || room.roomType.monthlyPrice;
      displayText = `/month (${Math.floor(daysDiff / 30)} month${Math.floor(daysDiff / 30) > 1 ? 's' : ''})`;
      pricingInfo = `${Math.floor(daysDiff / 30)}-MONTH RATE`;
    }
    
    return { price, displayText, pricingInfo };
  };

  // Price Calculation
  const pricing = useMemo(() => {
    if (!selectedRoom?.roomType) return null;
    const cIn = new Date(checkIn);
    const cOut = new Date(checkOut);
    if (isNaN(cIn.getTime()) || isNaN(cOut.getTime()) || cOut <= cIn) return null;

    return calculateBookingPrice({
      checkInDate: cIn,
      checkOutDate: cOut,
      basePrice: selectedRoom.roomType.basePrice || 999,
      weeklyDiscountPct: selectedRoom.roomType.weeklyDiscountPct,
      monthlyPrice: selectedRoom.roomType.monthlyPrice || 21999,
      securityDeposit: selectedRoom.roomType.securityDeposit,
      coupon: appliedCoupon,
    });
  }, [selectedRoom, checkIn, checkOut, appliedCoupon]);

  // Hold Countdown Timer
  useEffect(() => {
    if (step === 4 && holdSecondsLeft > 0) {
      const interval = setInterval(() => {
        setHoldSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step, holdSecondsLeft]);

  // Handle Coupon Apply
  const handleApplyCoupon = (codeToApply?: string) => {
    const code = (codeToApply || couponInput).trim().toUpperCase();
    setCouponError("");
    if (!code) return;

    if (code === "GENZFIRST") {
      setAppliedCoupon({
        code: "GENZFIRST",
        discountType: "PERCENTAGE",
        discountValue: 15,
        minBookingAmount: 1000,
        maxDiscountAmount: 500,
      });
    } else if (code === "COMMUNITY10") {
      setAppliedCoupon({
        code: "COMMUNITY10",
        discountType: "PERCENTAGE",
        discountValue: 10,
        minBookingAmount: 2000,
        maxDiscountAmount: 1000,
      });
    } else if (code === "MONTHLYVIBE") {
      setAppliedCoupon({
        code: "MONTHLYVIBE",
        discountType: "FIXED",
        discountValue: 2000,
        minBookingAmount: 12000,
      });
    } else {
      setCouponError("Invalid promo code. Try GENZFIRST for 15% off!");
    }
  };

  // Step 3 -> 4: Create Temporary Reservation Hold
  const handleInitiateHold = async () => {
    if (!guestName || !guestEmail || !guestPhone) {
      alert("Please fill in your name, email, and mobile number.");
      return;
    }

    setIsProcessingPayment(true);
    setPaymentError("");

    try {
      const payload = {
        hostelId: activeHostel.id,
        roomId: selectedRoomId,
        bedId: selectedBedId,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        guestName,
        guestEmail,
        guestPhone,
        guestGender,
        guestGovtId,
        couponCode: appliedCoupon?.code,
        specialRequests,
      };

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to initiate booking");
      }

      setCreatedBooking(json.data.booking);
      setHoldSecondsLeft(15 * 60);
      setStep(4);
      setShowSimulatorModal(true);
    } catch (err: any) {
      setPaymentError(err.message || "Error holding bed. Please try again.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Complete Payment (Simulated Sandbox or Razorpay)
  const handleConfirmPayment = async () => {
    if (!createdBooking) return;
    setIsProcessingPayment(true);
    setPaymentError("");

    try {
      const res = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: createdBooking.id,
          razorpayOrderId: `order_gz_${Date.now()}`,
          razorpayPaymentId: `pay_sim_${Math.random().toString(36).substring(2, 9)}`,
          razorpaySignature: "sim_sig_valid_2026",
          paymentMethod: simulatedMethod,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Payment confirmation failed");
      }

      router.push(
        `/confirmation?bookingRef=${createdBooking.bookingReference}&bookingId=${createdBooking.id}`
      );
    } catch (err: any) {
      setPaymentError(err.message || "Payment failed");
      setIsProcessingPayment(false);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 py-10 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Progress Indicator */}
          <div className="max-w-3xl mx-auto mb-12">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-800 -translate-y-1/2 -z-0" />
              {[
                { stepNum: 1, label: "Stay & Room" },
                { stepNum: 2, label: "Bed Allocation" },
                { stepNum: 3, label: "Guest Details" },
                { stepNum: 4, label: "Payment & Hold" },
              ].map((s) => {
                const isCompleted = step > s.stepNum;
                const isCurrent = step === s.stepNum;
                return (
                  <div
                    key={s.stepNum}
                    className="flex flex-col items-center gap-2 relative z-10"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                        isCompleted
                          ? "bg-emerald-500 text-white shadow-glow"
                          : isCurrent
                          ? "bg-indigo-600 text-white shadow-glow ring-4 ring-indigo-500/25"
                          : "bg-slate-900 border border-slate-700 text-slate-500"
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : s.stepNum}
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        isCurrent
                          ? "text-indigo-400 font-bold"
                          : isCompleted
                          ? "text-slate-300"
                          : "text-slate-500"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Left 2 Cols: Step Wizard Forms */}
            <div className="lg:col-span-2 space-y-8">
              {/* STEP 1: Stay & Room Type */}
              {step === 1 && (
                <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800/80 bg-[#111827]/85 space-y-6">
                  <div>
                    <h2 className="text-2xl font-black text-white">
                      Step 1: Choose Your Hostel & Dates
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Select which of our 4 spaces you wish to stay in.
                    </p>
                  </div>

                  {/* Hostel Selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400">
                      Hostel Location
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {hostels.map((h) => (
                        <div
                          key={h.id}
                          onClick={() => setSelectedHostelSlug(h.slug)}
                          className={`p-4 rounded-2xl border cursor-pointer transition ${
                            selectedHostelSlug === h.slug
                              ? "selection-glow bg-indigo-950/60 border-indigo-500 shadow-glow"
                              : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-sm text-white">{h.name}</h4>
                            <Badge variant="indigo" size="sm">
                              {h.city}
                            </Badge>
                          </div>
                          <p className="text-xs text-pink-400 mt-1">{h.tagline}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dates & Guests */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                        Check-In Date
                      </label>
                      <input
                        type="date"
                        min={todayStr}
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                        Check-Out Date
                      </label>
                      <input
                        type="date"
                        min={checkIn || todayStr}
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                        Guests
                      </label>
                      <select
                        value={guests}
                        onChange={(e) => setGuests(Number(e.target.value))}
                        className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                      >
                        {[1, 2, 3, 4].map((n) => (
                          <option key={n} value={n}>
                            {n} {n === 1 ? "Guest" : "Guests"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Rooms Available */}
                  <div className="space-y-4 pt-4 border-t border-slate-800">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3">
                        Available Room Categories
                      </label>

                      {/* Filter Options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        {/* Sharing Type Filter */}
                        <div>
                          <label className="block text-xs text-slate-300 mb-2">Room Type</label>
                          <div className="flex gap-2">
                            {["all", "1", "2", "3"].map((type) => (
                              <button
                                key={type}
                                onClick={() => setFilterSharingType(type as any)}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                                  filterSharingType === type
                                    ? "bg-indigo-600 text-white"
                                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                                }`}
                              >
                                {type === "all" ? "All" : `${type}-Share`}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* AC Filter */}
                        <div>
                          <label className="block text-xs text-slate-300 mb-2">AC Preference</label>
                          <div className="flex gap-2">
                            {["all", "ac", "non-ac"].map((ac) => (
                              <button
                                key={ac}
                                onClick={() => setFilterAC(ac as any)}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                                  filterAC === ac
                                    ? "bg-indigo-600 text-white"
                                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                                }`}
                              >
                                {ac === "all" ? "All" : ac === "ac" ? "🌬️ AC" : "⚡ Non-AC"}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {isLoadingAvailability ? (
                      <div className="p-8 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                        <span>Checking real-time bed inventory...</span>
                      </div>
                    ) : Object.keys(filteredAndGroupedRooms).length === 0 ? (
                      <div className="p-6 text-center text-slate-400 bg-slate-950 rounded-xl border border-slate-800">
                        <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                        <p>No rooms available matching your preferences.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(filteredAndGroupedRooms).map(([categoryName, rooms]) => (
                          <div key={categoryName} className="space-y-2">
                            <h4 className="text-sm font-bold text-indigo-300 pl-2">{categoryName}</h4>
                            <div className="space-y-2">
                              {rooms.map((r) => (
                                <div
                                  key={r.id}
                                  onClick={() => r.hasAvailability && setSelectedRoomId(r.id)}
                                  className={`p-4 rounded-2xl border flex items-center justify-between transition cursor-pointer ${
                                    selectedRoomId === r.id
                                      ? "selection-glow bg-indigo-950/60 border-indigo-500 shadow-glow"
                                      : r.hasAvailability
                                      ? "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                                      : "opacity-40 bg-slate-950 border-slate-900 cursor-not-allowed"
                                  }`}
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-sm text-white">
                                        Room {r.roomNumber}
                                      </span>
                                      <Badge
                                        variant={r.isAC ? "cyan" : "coral"}
                                        size="sm"
                                      >
                                        {r.isAC ? "🌬️ AC" : "⚡ Non-AC"}
                                      </Badge>
                                      <Badge
                                        variant={
                                          r.roomType.genderCategory === "FEMALE"
                                            ? "coral"
                                            : r.roomType.genderCategory === "PRIVATE"
                                            ? "default"
                                            : "default"
                                        }
                                        size="sm"
                                      >
                                        {r.roomType.genderCategory}
                                      </Badge>
                                    </div>
                                    <span className="text-xs text-emerald-400 font-semibold block">
                                      {r.totalAvailableBeds} beds available
                                    </span>
                                  </div>

                                  <div className="text-right">
                                    {(() => {
                                      const { price, displayText, pricingInfo } = getDisplayPrice(r);
                                      return (
                                        <>
                                          <span className="text-lg font-black text-white">
                                            ₹{Math.round(price)}
                                          </span>
                                          <span className="text-xs text-slate-400 block">
                                            {displayText}
                                          </span>
                                          {pricingInfo && (
                                            <span className="text-[10px] text-amber-400 font-bold block mt-0.5">
                                              {pricingInfo}
                                            </span>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button
                      variant="glow"
                      size="lg"
                      onClick={() => setStep(2)}
                      disabled={!selectedRoomId}
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      Continue to Bed Selection
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 2: Bed Allocation Picker */}
              {step === 2 && (
                <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800/80 bg-[#111827]/85 space-y-6">
                  <div>
                    <h2 className="text-2xl font-black text-white">
                      Step 2: Choose Your Exact Bed
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Pick your preferred bunk level or pod in Room {selectedRoom?.roomNumber} (Floor {selectedRoom?.floor}, {selectedRoom?.building}).
                    </p>
                  </div>

                  {/* Bed Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                    {selectedRoom?.beds?.map((bed: any) => {
                      const isAvail = bed.isAvailable;
                      const isSelected = selectedBedId === bed.id;
                      return (
                        <div
                          key={bed.id}
                          onClick={() => isAvail && setSelectedBedId(bed.id)}
                          className={`p-5 rounded-2xl border flex flex-col items-center text-center gap-3 transition ${
                            isSelected
                              ? "selection-glow bg-indigo-600 border-indigo-400 text-white shadow-glow"
                              : isAvail
                              ? "bg-slate-900/80 border-slate-700/80 text-slate-200 hover:border-indigo-500 cursor-pointer"
                              : "bg-slate-950/60 border-slate-900 opacity-40 cursor-not-allowed text-slate-500"
                          }`}
                        >
                          <BedIcon className="w-8 h-8" />
                          <div>
                            <span className="font-extrabold text-sm block">
                              {bed.bedNumber}
                            </span>
                            <span className="text-[10px] uppercase font-bold opacity-80">
                              {bed.tier.replace("_", " ")}
                            </span>
                          </div>

                          <Badge
                            variant={
                              isSelected
                                ? "indigo"
                                : isAvail
                                ? "available"
                                : "occupied"
                            }
                            size="sm"
                            className={isSelected ? "bg-white text-indigo-900 font-bold" : ""}
                          >
                            {isSelected
                              ? "SELECTED"
                              : isAvail
                              ? "AVAILABLE"
                              : bed.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 flex items-center gap-3 text-xs text-indigo-300">
                    <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>
                      You have selected <strong className="text-white">{selectedBed?.bedNumber}</strong> ({selectedBed?.tier?.replace("_", " ")}). This bed will be reserved exclusively for your stay.
                    </span>
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => setStep(1)}
                      leftIcon={<ArrowLeft className="w-4 h-4" />}
                    >
                      Back
                    </Button>
                    <Button
                      variant="glow"
                      size="lg"
                      onClick={() => setStep(3)}
                      disabled={!selectedBedId}
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      Guest Details & Promos
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3: Guest Details & Coupons */}
              {step === 3 && (
                <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800/80 bg-[#111827]/85 space-y-6">
                  <div>
                    <h2 className="text-2xl font-black text-white">
                      Step 3: Resident Information
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Required for automated reception check-in and QR pass issuance.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                        Full Name (as per Govt ID) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sameer Deshmukh"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                        Email Address (for Invoice & QR) *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. sameer@gmail.com"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                        WhatsApp / Mobile Number *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                        Gender
                      </label>
                      <select
                        value={guestGender}
                        onChange={(e) => setGuestGender(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other / Non-Binary</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                        Government ID Number (Aadhaar / Passport / Driving License)
                      </label>
                      <input
                        type="text"
                        placeholder="XXXX-XXXX-XXXX (verified at reception desk)"
                        value={guestGovtId}
                        onChange={(e) => setGuestGovtId(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                        Special Requests or Early Check-in Notes
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Arriving on early morning train, quiet work nook request..."
                        value={specialRequests}
                        onChange={(e) => setSpecialRequests(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Promo Coupons */}
                  <div className="pt-4 border-t border-slate-800 space-y-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      Apply Promo Coupon
                    </label>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter coupon (e.g. GENZFIRST)"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        className="flex-1 p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-white uppercase tracking-wider focus:outline-none focus:border-pink-500"
                      />
                      <Button
                        variant="secondary"
                        size="md"
                        onClick={() => handleApplyCoupon()}
                      >
                        Apply
                      </Button>
                    </div>

                    {couponError && (
                      <p className="text-xs text-rose-400 font-medium">{couponError}</p>
                    )}

                    {appliedCoupon && (
                      <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-between text-xs text-emerald-300">
                        <span>
                          Coupon <strong>{appliedCoupon.code}</strong> applied! (
                          {appliedCoupon.discountType === "PERCENTAGE"
                            ? `${appliedCoupon.discountValue}% off`
                            : `₹${appliedCoupon.discountValue} off`}
                          )
                        </span>
                        <button
                          onClick={() => setAppliedCoupon(null)}
                          className="text-slate-400 hover:text-white text-xs underline"
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1 text-xs">
                      <span className="text-slate-500 self-center">Available:</span>
                      <button
                        onClick={() => handleApplyCoupon("GENZFIRST")}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-pink-300 border border-slate-700 font-mono"
                      >
                        GENZFIRST (-15%)
                      </button>
                      <button
                        onClick={() => handleApplyCoupon("COMMUNITY10")}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 font-mono"
                      >
                        COMMUNITY10 (-10%)
                      </button>
                    </div>
                  </div>

                  {paymentError && (
                    <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{paymentError}</span>
                    </div>
                  )}

                  <div className="pt-4 flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => setStep(2)}
                      leftIcon={<ArrowLeft className="w-4 h-4" />}
                    >
                      Back
                    </Button>
                    <Button
                      variant="glow"
                      size="lg"
                      isLoading={isProcessingPayment}
                      onClick={handleInitiateHold}
                      rightIcon={<Lock className="w-4 h-4" />}
                    >
                      Lock Bed & Proceed to Pay
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 4: 15-Minute Temporary Hold Active */}
              {step === 4 && (
                <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-500/50 bg-[#111827]/95 space-y-6 shadow-2xl">
                  {/* Hold Banner */}
                  <div className="p-4 rounded-2xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600/30 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-indigo-400 animate-pulse" />
                      </div>
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                          Temporary Bed Hold Active
                        </span>
                        <p className="text-xs text-slate-300">
                          {selectedBed?.bedNumber} is temporarily locked for you.
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-2xl font-black text-white font-mono">
                        {formatTimer(holdSecondsLeft)}
                      </span>
                      <span className="text-[10px] text-slate-400 block uppercase">
                        Time Remaining
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white">
                      Complete Secure Payment
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Booking Reference:{" "}
                      <span className="font-mono text-indigo-400 font-bold">
                        {createdBooking?.bookingReference}
                      </span>
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <h4 className="text-sm font-bold text-white">Select Payment Method:</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { id: "upi", name: "UPI / QR", sub: "GPay, PhonePe" },
                        { id: "card", name: "Debit / Credit", sub: "Visa, MC, RuPay" },
                        { id: "netbanking", name: "NetBanking", sub: "All Indian Banks" },
                        { id: "cash", name: "Pay at Desk", sub: "Reception Desk" },
                      ].map((m) => (
                        <div
                          key={m.id}
                          onClick={() => setSimulatedMethod(m.id)}
                          className={`p-3 rounded-xl border cursor-pointer transition ${
                            simulatedMethod === m.id
                              ? "bg-indigo-950/70 border-indigo-500 shadow-glow"
                              : "bg-slate-900 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <span className="text-xs font-bold text-white block">
                            {m.name}
                          </span>
                          <span className="text-[10px] text-slate-400">{m.sub}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {paymentError && (
                    <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-xs text-red-300">
                      {paymentError}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4">
                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => setStep(3)}
                    >
                      Modify Details
                    </Button>
                    <Button
                      variant="glow"
                      size="lg"
                      isLoading={isProcessingPayment}
                      onClick={handleConfirmPayment}
                      rightIcon={<CreditCard className="w-4 h-4" />}
                    >
                      Pay ₹{pricing?.totalAmount.toLocaleString()} & Confirm
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Right 1 Col: Live Stay & Price Summary Card */}
            <div className="lg:col-span-1">
              <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800/80 bg-[#111827]/90 space-y-6 sticky top-28 shadow-xl">
                <div>
                  <h3 className="text-lg font-bold text-white">Stay Summary</h3>
                  <span className="text-xs text-pink-400 font-semibold block mt-0.5">
                    {activeHostel?.name}
                  </span>
                </div>

                <div className="space-y-3 text-xs text-slate-300 border-y border-slate-800 py-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Location</span>
                    <span className="font-semibold text-white">
                      {activeHostel?.city}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Check-In</span>
                    <span className="font-semibold text-white">{checkIn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Check-Out</span>
                    <span className="font-semibold text-white">{checkOut}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Room</span>
                    <span className="font-semibold text-white">
                      {selectedRoom?.roomType?.name || "Selecting..."}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Assigned Bed</span>
                    <span className="font-semibold text-indigo-400">
                      {selectedBed ? selectedBed.bedNumber : "Select in Step 2"}
                    </span>
                  </div>
                </div>

                {/* Price Breakdown */}
                {pricing && (
                  <div className="space-y-2.5 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span>
                        Stay ({pricing.nights} {pricing.nights === 1 ? "night" : "nights"} •{" "}
                        {pricing.stayType})
                      </span>
                      <span className="font-semibold text-white">
                        ₹{pricing.baseAmount.toLocaleString()}
                      </span>
                    </div>

                    {pricing.weeklyDiscountApplied > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Weekly Discount</span>
                        <span>-₹{pricing.weeklyDiscountApplied.toLocaleString()}</span>
                      </div>
                    )}

                    {pricing.discountAmount > 0 && (
                      <div className="flex justify-between text-pink-400">
                        <span>Coupon Discount ({pricing.couponCode})</span>
                        <span>-₹{pricing.discountAmount.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span>Hospitality GST (12%)</span>
                      <span className="font-semibold text-white">
                        ₹{pricing.taxAmount.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span>Service Fee</span>
                      <span className="font-semibold text-white">
                        ₹{pricing.serviceFee}
                      </span>
                    </div>

                    {pricing.securityDeposit > 0 && (
                      <div className="flex justify-between text-amber-300">
                        <span>Refundable Deposit</span>
                        <span>₹{pricing.securityDeposit.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-sm font-bold text-white">
                      <span>Total Payable</span>
                      <span className="text-2xl font-black text-indigo-400">
                        ₹{pricing.totalAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Free cancellation up to 7 days before check-in</span>
                  </div>
                  <p>Includes high-speed fiber, cafe access, and biometric pass.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BookClient;
