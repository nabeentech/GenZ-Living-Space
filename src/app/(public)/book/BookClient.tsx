"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import DatePicker from "@/components/ui/DatePicker";
import CustomSelect from "@/components/ui/CustomSelect";
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
  CreditCard,
  QrCode,
  AlertCircle,
  Loader2,
  Search,
  RotateCcw,
} from "lucide-react";
import { addUtcCalendarDays, calculateBookingPrice, calculateStayBaseAmount, getRoomTypePriceRates } from "@/lib/pricing";
import BookingAuthModal from "@/components/public/BookingAuthModal";

export const ID_OPTIONS = [
  { value: "AADHAAR", label: "Aadhaar Card" },
  { value: "PAN", label: "PAN Card" },
  { value: "PASSPORT", label: "Passport" },
  { value: "DRIVING_LICENSE", label: "Driving License" },
  { value: "VOTER_ID", label: "Voter ID" },
];

export const ID_TYPE_CONFIG: Record<
  string,
  { label: string; placeholder: string; helper: string; maxLength: number }
> = {
  AADHAAR: {
    label: "Aadhaar Number",
    placeholder: "1234-5678-9012",
    helper: "12 digits • Auto-hyphenated (XXXX-XXXX-XXXX)",
    maxLength: 14,
  },
  PAN: {
    label: "PAN Card Number",
    placeholder: "ABCDE-1234-F",
    helper: "10 characters • Auto-hyphenated (5 letters - 4 digits - 1 letter)",
    maxLength: 12,
  },
  PASSPORT: {
    label: "Passport Number",
    placeholder: "A-1234567",
    helper: "8 characters (1 letter + 7 digits)",
    maxLength: 9,
  },
  DRIVING_LICENSE: {
    label: "Driving License Number",
    placeholder: "TS-09-2022-0001234",
    helper: "State - RTO - Year - Number",
    maxLength: 19,
  },
  VOTER_ID: {
    label: "Voter ID (EPIC) Number",
    placeholder: "ABC-1234567",
    helper: "10 characters (3 letters + 7 digits)",
    maxLength: 11,
  },
};

export function formatGovtId(raw: string, idType: string, isDeleting: boolean = false): string {
  const val = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  switch (idType) {
    case "AADHAAR": {
      const digits = val.replace(/\D/g, "").slice(0, 12);
      if (digits.length <= 4) {
        return digits.length === 4 && !isDeleting ? `${digits}-` : digits;
      }
      if (digits.length <= 8) {
        const p1 = digits.slice(0, 4);
        const p2 = digits.slice(4);
        return digits.length === 8 && !isDeleting ? `${p1}-${p2}-` : `${p1}-${p2}`;
      }
      const p1 = digits.slice(0, 4);
      const p2 = digits.slice(4, 8);
      const p3 = digits.slice(8, 12);
      return `${p1}-${p2}-${p3}`;
    }
    case "PAN": {
      // Standard Indian PAN: 5 uppercase letters, 4 digits, 1 uppercase letter (e.g. ABCDE-1234-F)
      let letters1 = "";
      let numbers = "";
      let letter2 = "";
      let i = 0;
      while (i < val.length && letters1.length < 5) {
        if (/[A-Z]/.test(val[i])) letters1 += val[i];
        i++;
      }
      while (i < val.length && numbers.length < 4) {
        if (/[0-9]/.test(val[i])) numbers += val[i];
        i++;
      }
      while (i < val.length && letter2.length < 1) {
        if (/[A-Z]/.test(val[i])) letter2 += val[i];
        i++;
      }
      if (letters1.length < 5) {
        return letters1;
      }
      if (numbers.length === 0) {
        return !isDeleting ? `${letters1}-` : letters1;
      }
      if (numbers.length < 4) {
        return `${letters1}-${numbers}`;
      }
      if (letter2.length === 0) {
        return !isDeleting ? `${letters1}-${numbers}-` : `${letters1}-${numbers}`;
      }
      return `${letters1}-${numbers}-${letter2}`;
    }
    case "PASSPORT": {
      let letter = "";
      let digits = "";
      for (const char of val) {
        if (!letter && /[A-Z]/.test(char)) letter = char;
        else if (letter && /[0-9]/.test(char) && digits.length < 7) digits += char;
      }
      if (!letter) return "";
      if (digits.length === 0) return !isDeleting ? `${letter}-` : letter;
      return `${letter}-${digits}`;
    }
    case "DRIVING_LICENSE": {
      let state = "";
      let rto = "";
      let year = "";
      let num = "";
      let i = 0;
      while (i < val.length && state.length < 2) { if (/[A-Z]/.test(val[i])) state += val[i]; i++; }
      while (i < val.length && rto.length < 2) { if (/[0-9]/.test(val[i])) rto += val[i]; i++; }
      while (i < val.length && year.length < 4) { if (/[0-9]/.test(val[i])) year += val[i]; i++; }
      while (i < val.length && num.length < 7) { if (/[0-9]/.test(val[i])) num += val[i]; i++; }

      if (state.length < 2) return state;
      if (rto.length === 0) return !isDeleting ? `${state}-` : state;
      if (rto.length < 2) return `${state}-${rto}`;
      if (year.length === 0) return !isDeleting ? `${state}-${rto}-` : `${state}-${rto}`;
      if (year.length < 4) return `${state}-${rto}-${year}`;
      if (num.length === 0) return !isDeleting ? `${state}-${rto}-${year}-` : `${state}-${rto}-${year}`;
      return `${state}-${rto}-${year}-${num}`;
    }
    case "VOTER_ID": {
      let letters = "";
      let digits = "";
      for (const char of val) {
        if (letters.length < 3 && /[A-Z]/.test(char)) letters += char;
        else if (letters.length === 3 && /[0-9]/.test(char) && digits.length < 7) digits += char;
      }
      if (letters.length < 3) return letters;
      if (digits.length === 0) return !isDeleting ? `${letters}-` : letters;
      return `${letters}-${digits}`;
    }
    default:
      return val.slice(0, 20);
  }
}

export const getSharingCategoryName = (room: any): string => {
  if (!room) return "Single Sharing";
  if (room.capacity === 1 || /single|studio|private|1/i.test(room.roomType?.name || "")) return "Single Sharing";
  if (room.capacity === 2 || /twin|double|2/i.test(room.roomType?.name || "")) return "Double Sharing";
  if (room.capacity === 3 || /triple|3/i.test(room.roomType?.name || "")) return "Triple Sharing";
  if (room.capacity === 4 || /quad|four|4/i.test(room.roomType?.name || "")) return "Four Sharing";
  return room.roomType?.name || "Single Sharing";
};

export const BookClient: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRoomTypeParam = searchParams.get("roomType") || searchParams.get("roomTypeId") || "";

  const stepParam = searchParams.get("step");
  const initialStep = stepParam ? parseInt(stepParam, 10) : searchParams.get("resume") === "1" ? 3 : 1;
  const [step, setStep] = useState(initialStep);
  // 1: Stay & Room, 2: Bed Selection, 3: Guest Details & Coupons, 4: Payment Hold & Checkout

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [hostels, setHostels] = useState<any[]>([]);
  const [selectedHostelSlug, setSelectedHostelSlug] = useState(
    searchParams.get("hostel") || "genz-colive-pg-guest-rooms"
  );

  const todayStr = new Date().toISOString().split("T")[0];
  const defaultOut = new Date();
  defaultOut.setDate(defaultOut.getDate() + 3);
  const defaultOutStr = defaultOut.toISOString().split("T")[0];

  const [checkIn, setCheckIn] = useState(
    searchParams.get("checkIn") || todayStr
  );
  const [stayType, setStayType] = useState(searchParams.get("stayType") === "MONTHLY" ? "MONTHLY" : "DAILY");
  const [checkOut, setCheckOut] = useState(
    searchParams.get("checkOut") || (searchParams.get("stayType") === "MONTHLY" ? (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split("T")[0]; })() : defaultOutStr)
  );
  const guests = 1;

  // Selected Room & Bed
  const [roomsData, setRoomsData] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(searchParams.get("roomId") || "");
  const [selectedBedId, setSelectedBedId] = useState<string>(searchParams.get("bedId") || "");
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  const authResumeUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedHostelSlug) params.set("hostel", selectedHostelSlug);
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    if (stayType) params.set("stayType", stayType);
    if (selectedRoomId) params.set("roomId", selectedRoomId);
    if (selectedBedId) params.set("bedId", selectedBedId);
    params.set("step", "3");
    return `/book?${params.toString()}`;
  }, [selectedHostelSlug, checkIn, checkOut, stayType, selectedRoomId, selectedBedId]);

  // Sync draft to sessionStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (selectedRoomId || selectedBedId || step >= 2) {
        sessionStorage.setItem(
          "genz_booking_resume",
          JSON.stringify({
            hostelSlug: selectedHostelSlug,
            checkIn,
            checkOut,
            stayType,
            roomId: selectedRoomId,
            bedId: selectedBedId,
            step: Math.max(step, 3),
          })
        );
      }
    } catch {}
  }, [selectedHostelSlug, checkIn, checkOut, stayType, selectedRoomId, selectedBedId, step]);

  // Restore draft from sessionStorage if missing from query params
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = sessionStorage.getItem("genz_booking_resume");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.roomId && !searchParams.get("roomId")) setSelectedRoomId(parsed.roomId);
        if (parsed.bedId && !searchParams.get("bedId")) setSelectedBedId(parsed.bedId);
        if (parsed.hostelSlug && !searchParams.get("hostel")) setSelectedHostelSlug(parsed.hostelSlug);
        if (parsed.checkIn && !searchParams.get("checkIn")) setCheckIn(parsed.checkIn);
        if (parsed.checkOut && !searchParams.get("checkOut")) setCheckOut(parsed.checkOut);
        if (parsed.stayType && !searchParams.get("stayType")) setStayType(parsed.stayType);
        if (parsed.step && !searchParams.get("step")) setStep(parsed.step);
      }
    } catch {}
  }, [searchParams]);


  // Room Filters & Search
  const [filterFloor, setFilterFloor] = useState<number | "all">("all");
  const [filterAC, setFilterAC] = useState<"ac" | "non-ac" | "all">("all");
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>("all");
  const [roomSearchQuery, setRoomSearchQuery] = useState<string>("");

  // Guest Details
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestGender, setGuestGender] = useState("MALE");
  const [govtIdType, setGovtIdType] = useState("AADHAAR");
  const [guestGovtId, setGuestGovtId] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  const handleGovtIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    const isDeleting = val.length < guestGovtId.length;
    if (isDeleting && guestGovtId.endsWith("-")) {
      val = val.slice(0, -1);
    }
    const formatted = formatGovtId(val, govtIdType, isDeleting);
    setGuestGovtId(formatted);
  };

  // Coupon
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState("");

  // Active Hold & Payment
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");

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

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json?.user) return;
        setCurrentUser(json.user);
        setGuestName(json.user.name || "");
        setGuestEmail(json.user.email || "");
        setGuestPhone(json.user.phone || "");
        setGuestGender(json.user.gender || "MALE");
        if (json.user.govtIdType) {
          setGovtIdType(json.user.govtIdType);
        }
        if (json.user.govtIdNumber) {
          setGuestGovtId(formatGovtId(json.user.govtIdNumber, json.user.govtIdType || "AADHAAR"));
        }
        if (searchParams.get("step") === "3" || searchParams.get("resume") === "1") {
          setStep(3);
        }
      })
      .catch(() => undefined);
  }, []);

  const handleAuthSuccess = (user: any) => {
    setCurrentUser(user);
    if (user.name) setGuestName(user.name);
    if (user.email) setGuestEmail(user.email);
    if (user.phone) setGuestPhone(user.phone);
    if (user.gender) setGuestGender(user.gender);
    if (user.govtIdType) setGovtIdType(user.govtIdType);
    if (user.govtIdNumber) setGuestGovtId(formatGovtId(user.govtIdNumber, user.govtIdType || "AADHAAR"));
    setStep(3);
  };

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
        const url = `/api/availability?hostelId=${activeHostel.id}&checkIn=${checkIn}&checkOut=${checkOut}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.success && json.data?.rooms) {
          const loadedRooms: any[] = json.data.rooms;
          setRoomsData(loadedRooms);

          if (loadedRooms.length > 0) {
            let targetRoom: any = null;

            // 1. If roomType query param was passed, prioritize room matching this roomType
            if (initialRoomTypeParam) {
              const match = loadedRooms.find(
                (r: any) =>
                  r.roomTypeId === initialRoomTypeParam ||
                  r.roomType?.id === initialRoomTypeParam ||
                  r.roomType?.slug === initialRoomTypeParam
              );
              if (match) {
                const cat = getSharingCategoryName(match);
                setSelectedCategoryTab(cat);
                const categoryRooms = loadedRooms.filter((r: any) => getSharingCategoryName(r) === cat);
                targetRoom = categoryRooms.find((r: any) => r.hasAvailability) || match;
              }
            }

            // 2. If roomId query param was passed
            if (!targetRoom && searchParams.get("roomId")) {
              targetRoom = loadedRooms.find((r: any) => r.id === searchParams.get("roomId"));
              if (targetRoom) {
                setSelectedCategoryTab(getSharingCategoryName(targetRoom));
              }
            }

            // 3. Fallback: preserve existing selectedRoom if valid, else pick first available
            if (!targetRoom) {
              if (selectedRoomId) {
                targetRoom = loadedRooms.find((r: any) => r.id === selectedRoomId);
              }
              if (!targetRoom) {
                targetRoom = loadedRooms.find((r: any) => r.hasAvailability) || loadedRooms[0];
              }
            }

            if (targetRoom) {
              setSelectedRoomId(targetRoom.id);
              const avail = targetRoom.beds?.find((b: any) => b.isAvailable) || targetRoom.beds?.[0];
              if (avail) {
                setSelectedBedId(avail.id);
              }
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
  }, [activeHostel, checkIn, checkOut, initialRoomTypeParam]);

  // Selected Room Object
  const selectedRoom = useMemo(
    () => roomsData.find((r) => r.id === selectedRoomId),
    [roomsData, selectedRoomId]
  );

  // Auto pick first available bed if room changes
  useEffect(() => {
    if (selectedRoom?.beds) {
      const requestedBed = selectedRoom.beds.find((b: any) => b.id === selectedBedId && b.isAvailable);
      if (requestedBed) return;
      const avail = selectedRoom.beds.find((b: any) => b.isAvailable);
      if (avail) {
        setSelectedBedId(avail.id);
      } else {
        setSelectedBedId("");
      }
    }
  }, [selectedRoom, selectedBedId]);

  const selectedBed = useMemo(
    () => selectedRoom?.beds?.find((b: any) => b.id === selectedBedId),
    [selectedRoom, selectedBedId]
  );

  // When user selects a category tab, also auto-select an available room in that category
  const handleSelectCategoryTab = (catName: string) => {
    setSelectedCategoryTab(catName);
    if (catName === "all") return;

    if (!selectedRoom || getSharingCategoryName(selectedRoom) !== catName) {
      const candidateRooms = roomsData.filter((r) => getSharingCategoryName(r) === catName);
      const chosen = candidateRooms.find((r) => r.hasAvailability) || candidateRooms[0];
      if (chosen) {
        setSelectedRoomId(chosen.id);
        const availBed = chosen.beds?.find((b: any) => b.isAvailable) || chosen.beds?.[0];
        if (availBed) {
          setSelectedBedId(availBed.id);
        } else {
          setSelectedBedId("");
        }
      }
    }
  };

  // Rooms of the same category for Step 2 switching
  const roomsOfSameCategory = useMemo(() => {
    if (!selectedRoom) return [];
    const cat = getSharingCategoryName(selectedRoom);
    return roomsData.filter((r) => getSharingCategoryName(r) === cat);
  }, [roomsData, selectedRoom]);

  // Distinct category list and counts ordered: Single Sharing, Double Sharing, Triple Sharing, Four Sharing
  const categoriesList = useMemo(() => {
    const counts: Record<string, number> = {
      "Single Sharing": 0,
      "Double Sharing": 0,
      "Triple Sharing": 0,
      "Four Sharing": 0,
    };

    roomsData.forEach((r) => {
      const cat = getSharingCategoryName(r);
      if (counts[cat] !== undefined) {
        counts[cat] += 1;
      } else {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });

    const orderedKeys = ["Single Sharing", "Double Sharing", "Triple Sharing", "Four Sharing"];
    const result: { name: string; count: number }[] = [];

    orderedKeys.forEach((key) => {
      if (counts[key] > 0) {
        result.push({ name: key, count: counts[key] });
      }
    });

    Object.keys(counts).forEach((key) => {
      if (!orderedKeys.includes(key) && counts[key] > 0) {
        result.push({ name: key, count: counts[key] });
      }
    });

    return result;
  }, [roomsData]);

  // Dynamic Floor counts across loaded rooms
  const floorCounts = useMemo(() => {
    const map = new Map<number, number>();
    roomsData.forEach((r) => {
      const f = typeof r.floor === "number" ? r.floor : parseInt(r.floor) || 1;
      map.set(f, (map.get(f) || 0) + 1);
    });
    const sortedFloors = Array.from(map.keys()).sort((a, b) => a - b);
    return {
      all: roomsData.length,
      floors: sortedFloors.map((floor) => ({
        floor,
        count: map.get(floor) || 0,
      })),
    };
  }, [roomsData]);

  // Counts by AC preference
  const acCounts = useMemo(() => {
    return {
      all: roomsData.length,
      ac: roomsData.filter((r) => r.isAC === true).length,
      "non-ac": roomsData.filter((r) => r.isAC === false).length,
    };
  }, [roomsData]);

  // Filtered rooms list
  const filteredRoomsList = useMemo(() => {
    let list = roomsData;

    // Filter by floor
    if (filterFloor !== "all") {
      list = list.filter((r) => r.floor === filterFloor);
    }

    // Filter by AC status
    if (filterAC !== "all") {
      list = list.filter((r) => {
        if (filterAC === "ac") return r.isAC === true;
        if (filterAC === "non-ac") return r.isAC === false;
        return true;
      });
    }

    // Filter by Category tab ("Double share", "Triple share", "Single share")
    if (selectedCategoryTab !== "all") {
      list = list.filter((r) => getSharingCategoryName(r) === selectedCategoryTab);
    }

    // Filter by room search query
    if (roomSearchQuery.trim()) {
      const q = roomSearchQuery.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.roomNumber?.toLowerCase().includes(q) ||
          r.building?.toLowerCase().includes(q) ||
          String(r.floor).includes(q) ||
          r.roomType?.name?.toLowerCase().includes(q) ||
          getSharingCategoryName(r).toLowerCase().includes(q)
      );
    }

    return list;
  }, [roomsData, filterFloor, filterAC, selectedCategoryTab, roomSearchQuery]);

  // Total available beds in current filtered list
  const filteredAvailableBedsCount = useMemo(() => {
    return filteredRoomsList.reduce((acc, r) => acc + (r.totalAvailableBeds || 0), 0);
  }, [filteredRoomsList]);

  // Group filtered rooms by category in order: Single Sharing, Double Sharing, Triple Sharing, Four Sharing
  const filteredAndGroupedRooms = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    filteredRoomsList.forEach((room) => {
      const key = getSharingCategoryName(room);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(room);
    });

    const ordered: Record<string, any[]> = {};
    const order = ["Single Sharing", "Double Sharing", "Triple Sharing", "Four Sharing"];
    order.forEach((k) => {
      if (grouped[k] && grouped[k].length > 0) {
        ordered[k] = grouped[k];
      }
    });
    Object.keys(grouped).forEach((k) => {
      if (!order.includes(k) && grouped[k].length > 0) {
        ordered[k] = grouped[k];
      }
    });

    return ordered;
  }, [filteredRoomsList]);

  const hasActiveFilters =
    filterFloor !== "all" ||
    filterAC !== "all" ||
    selectedCategoryTab !== "all" ||
    Boolean(roomSearchQuery.trim());

  const handleResetFilters = () => {
    setFilterFloor("all");
    setFilterAC("all");
    setSelectedCategoryTab("all");
    setRoomSearchQuery("");
  };

  // Quote room cards from the same admin rate card used for checkout.
  const getDisplayPrice = (room: any): { price: number; displayText: string; pricingInfo: string } => {
    const rates = getRoomTypePriceRates(room.roomType, room.isAC);
    if (stayType === "MONTHLY") return { price: rates.days30, displayText: "/month", pricingInfo: "ADMIN MONTHLY RATE" };
    const cIn = new Date(checkIn);
    const cOut = stayType === "MONTHLY"
      ? addUtcCalendarDays(cIn, 30)
      : new Date(checkOut);
    const nights = !isNaN(cIn.getTime()) && !isNaN(cOut.getTime()) && cOut > cIn
      ? Math.ceil((cOut.getTime() - cIn.getTime()) / 86400000)
      : 1;
    const price = calculateStayBaseAmount(nights, rates);
    return { price, displayText: nights === 1 ? "/night" : `/stay (${nights} nights)`, pricingInfo: nights === 1 ? "ADMIN DAILY RATE" : "ADMIN DURATION RATES" };
  };

  // Price Calculation
  const pricing = useMemo(() => {
    if (!selectedRoom?.roomType) return null;
    const cIn = new Date(checkIn);
    const cOut = stayType === "MONTHLY"
      ? addUtcCalendarDays(cIn, 30)
      : new Date(checkOut);
    if (isNaN(cIn.getTime()) || isNaN(cOut.getTime()) || cOut <= cIn) return null;

    const rates = getRoomTypePriceRates(selectedRoom.roomType, selectedRoom.isAC);

    return calculateBookingPrice({
      checkInDate: cIn,
      checkOutDate: cOut,
      basePrice: rates.daily,
      rates,
      stayType: stayType === "MONTHLY" ? "MONTHLY" : "DAILY",
      weeklyDiscountPct: selectedRoom.roomType.weeklyDiscountPct,
      monthlyPrice: rates.days30,
      securityDeposit: selectedRoom.roomType.securityDeposit,
      coupon: appliedCoupon,
    });
  }, [selectedRoom, checkIn, checkOut, stayType, appliedCoupon]);

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
    let sessionRes: Response;
    try {
      sessionRes = await fetch("/api/auth/me");
    } catch {
      setPaymentError("We could not verify your account. Please check your connection and try again.");
      return;
    }
    if (!sessionRes.ok) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!guestName || !guestEmail || !guestPhone) {
      alert("Please fill in your name, email, and mobile number.");
      return;
    }

    if (!guestGovtId.trim()) {
      setPaymentError(`Please enter your ${ID_TYPE_CONFIG[govtIdType]?.label || "Government ID"}.`);
      return;
    }
    const cleanId = guestGovtId.replace(/-/g, "").trim();
    if (govtIdType === "AADHAAR" && cleanId.length !== 12) {
      setPaymentError("Aadhaar number must be exactly 12 digits (e.g. 1234-5678-9012).");
      return;
    }
    if (govtIdType === "PAN" && cleanId.length !== 10) {
      setPaymentError("PAN card number must be exactly 10 characters: 5 letters, 4 digits, 1 letter (e.g. ABCDE-1234-F).");
      return;
    }
    if (govtIdType === "PASSPORT" && cleanId.length !== 8) {
      setPaymentError("Passport number must be 8 characters: 1 letter + 7 digits (e.g. A-1234567).");
      return;
    }
    if (govtIdType === "VOTER_ID" && cleanId.length !== 10) {
      setPaymentError("Voter ID must be 10 characters: 3 letters + 7 digits (e.g. ABC-1234567).");
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
        stayType,
        guestName,
        guestEmail,
        guestPhone,
        guestGender,
        guestGovtId,
        govtIdType,
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

      // Initiate PhonePe V2 Hosted Checkout
      try {
        const orderRes = await fetch("/api/payments/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: json.data.booking.id }),
        });
        const orderJson = await orderRes.json();
        if (orderRes.ok && orderJson.success && orderJson.data?.redirectUrl) {
          window.location.href = orderJson.data.redirectUrl;
          return;
        }
      } catch (orderErr) {
        console.warn("PhonePe order checkout redirect skipped, fallback to confirmation:", orderErr);
      }

      router.replace(`/confirmation?bookingId=${encodeURIComponent(json.data.booking.id)}`);
    } catch (err: any) {
      setPaymentError(err.message || "Error holding bed. Please try again.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!createdBooking) return;
    setIsProcessingPayment(true);
    setPaymentError("");
    try {
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: createdBooking.id }),
      });
      const orderJson = await orderRes.json();
      if (orderRes.ok && orderJson.success && orderJson.data?.redirectUrl) {
        window.location.href = orderJson.data.redirectUrl;
        return;
      }
      router.replace(`/confirmation?bookingRef=${encodeURIComponent(createdBooking.bookingReference)}&bookingId=${encodeURIComponent(createdBooking.id)}`);
    } catch (err: any) {
      setPaymentError(err.message || "Failed to initiate PhonePe payment");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col">
      <Navbar user={currentUser} />

      <main className="flex-1 py-10 lg:py-16 pb-28 lg:pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Progress Indicator */}
          <div className="max-w-3xl mx-auto mb-12">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-800 -translate-y-1/2 -z-0" />
              {[
                { stepNum: 1, label: "Stay & Room" },
                { stepNum: 2, label: "Bed Allocation" },
                { stepNum: 3, label: "Guest Details" },
                { stepNum: 4, label: "Confirm" },
              ].map((s) => {
                const isCompleted = step > s.stepNum;
                const isCurrent = step === s.stepNum;
                return (
                  <div
                    key={s.stepNum}
                    className="flex flex-col items-center gap-2 relative z-10"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${isCompleted
                          ? "bg-emerald-500 text-white shadow-glow"
                          : isCurrent
                            ? "bg-indigo-600 text-white shadow-glow ring-4 ring-indigo-500/25"
                            : "bg-slate-900 border border-slate-700 text-slate-500"
                        }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : s.stepNum}
                    </div>
                    <span
                      className={`text-xs font-semibold ${isCurrent
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
                          className={`p-4 rounded-2xl border cursor-pointer transition ${selectedHostelSlug === h.slug
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

                  {/* Dates */}
                  <div className={`grid grid-cols-1 ${stayType === "MONTHLY" ? "sm:grid-cols-2" : "sm:grid-cols-3"} gap-4`}>
                    <CustomSelect label="Stay Type" value={stayType} onValueChange={(value) => { setStayType(value); if (value === "MONTHLY") setCheckOut(addUtcCalendarDays(new Date(`${checkIn}T00:00:00.000Z`), 30).toISOString().slice(0, 10)); }} triggerClassName="rounded-xl border border-slate-700 bg-slate-900 p-3" options={[{ value: "DAILY", label: "Daily stay" }, { value: "MONTHLY", label: "Month-to-month tenant" }]} />
                    <DatePicker label="Check-In Date" min={todayStr} value={checkIn} onChange={(value) => { setCheckIn(value); if (stayType === "MONTHLY") setCheckOut(addUtcCalendarDays(new Date(`${value}T00:00:00.000Z`), 30).toISOString().slice(0, 10)); }} triggerClassName="min-h-[3.25rem] rounded-xl border border-slate-700 bg-slate-900 p-3" />
                    {stayType !== "MONTHLY" && <DatePicker label="Check-Out Date" min={checkIn || todayStr} value={checkOut} onChange={setCheckOut} triggerClassName="min-h-[3.25rem] rounded-xl border border-slate-700 bg-slate-900 p-3" />}
                  </div>

                  {/* Rooms Available */}
                  <div className="space-y-4 pt-4 border-t border-slate-800">
                    {/* Search & Category Pills */}
                    <div className="space-y-3">
                      {/* Search Bar */}
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search by room number, floor, or category (e.g. 101, Floor 2)..."
                            value={roomSearchQuery}
                            onChange={(e) => setRoomSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-12 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                          />
                          {roomSearchQuery && (
                            <button
                              onClick={() => setRoomSearchQuery("")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        {hasActiveFilters && (
                          <button
                            onClick={handleResetFilters}
                            className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700 shrink-0"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                            Reset
                          </button>
                        )}
                      </div>

                      {/* Category Pills: Single share, Double share, Triple share, Four share */}
                      {categoriesList.length > 0 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs custom-scrollbar">
                          <button
                            onClick={() => handleSelectCategoryTab("all")}
                            className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition ${selectedCategoryTab === "all"
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
                              }`}
                          >
                            All Categories ({roomsData.length})
                          </button>
                          {categoriesList.map((cat) => (
                            <button
                              key={cat.name}
                              onClick={() => handleSelectCategoryTab(cat.name)}
                              className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition ${selectedCategoryTab === cat.name
                                  ? "bg-indigo-600 text-white shadow-sm"
                                  : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
                                }`}
                            >
                              {cat.name} ({cat.count})
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Filter Options (Floor & AC) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Floor Filter */}
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                            Floor
                          </label>
                          <div className="flex gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
                            <button
                              onClick={() => setFilterFloor("all")}
                              className={`flex-1 min-w-[42px] py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition ${filterFloor === "all"
                                  ? "bg-indigo-600 text-white"
                                  : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
                                }`}
                            >
                              All
                            </button>
                            {floorCounts.floors.map(({ floor }) => (
                              <button
                                key={floor}
                                onClick={() => setFilterFloor(floor)}
                                className={`flex-1 min-w-[36px] py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition ${filterFloor === floor
                                    ? "bg-indigo-600 text-white"
                                    : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
                                  }`}
                              >
                                {floor}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* AC Filter */}
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                            AC Preference
                          </label>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setFilterAC("all")}
                              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition ${filterAC === "all"
                                  ? "bg-indigo-600 text-white"
                                  : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
                                }`}
                            >
                              All ({acCounts.all})
                            </button>
                            <button
                              onClick={() => setFilterAC("ac")}
                              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition ${filterAC === "ac"
                                  ? "bg-indigo-600 text-white"
                                  : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
                                }`}
                            >
                              🌬️ AC ({acCounts.ac})
                            </button>
                            <button
                              onClick={() => setFilterAC("non-ac")}
                              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition ${filterAC === "non-ac"
                                  ? "bg-indigo-600 text-white"
                                  : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
                                }`}
                            >
                              ⚡ Non-AC ({acCounts["non-ac"]})
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Room Grid or States */}
                    {isLoadingAvailability ? (
                      <div className="p-8 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                        <span>Checking real-time bed inventory...</span>
                      </div>
                    ) : Object.keys(filteredAndGroupedRooms).length === 0 ? (
                      <div className="p-8 text-center text-slate-400 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                        <AlertCircle className="w-8 h-8 mx-auto text-amber-400" />
                        <div>
                          <p className="font-bold text-white text-sm">No rooms match your filter criteria.</p>
                          <p className="text-xs text-slate-400 mt-1">Try switching sharing type or clearing search filters.</p>
                        </div>
                        {hasActiveFilters && (
                          <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                            Clear All Filters
                          </Button>
                        )}
                      </div>
                    ) : (
                      /* Contained scrollable container with 2-column room cards */
                      <div className="space-y-6 max-h-[520px] overflow-y-auto px-2 py-1 custom-scrollbar">
                        {Object.entries(filteredAndGroupedRooms).map(([categoryName, rooms]) => {
                          const catBedsAvailable = rooms.reduce((sum, r) => sum + (r.totalAvailableBeds || 0), 0);
                          return (
                            <div key={categoryName} className="space-y-2.5">
                              {/* Sticky Category Header */}
                              <div className="sticky top-0 z-10 bg-[#111827]/95 backdrop-blur-md py-1.5 px-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-300">
                                  {categoryName}
                                </h4>
                                <span className="text-[11px] font-semibold text-slate-400">
                                  {rooms.length} {rooms.length === 1 ? "room" : "rooms"} •{" "}
                                  <span className="text-emerald-400">{catBedsAvailable} beds open</span>
                                </span>
                              </div>

                              {/* 2-Column Responsive Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {rooms.map((r) => {
                                  const isSelected = selectedRoomId === r.id;
                                  const { price, displayText } = getDisplayPrice(r);
                                  return (
                                    <div
                                      key={r.id}
                                      onClick={() => {
                                        if (!r.hasAvailability) return;
                                        const roomCat = getSharingCategoryName(r);
                                        setSelectedCategoryTab(roomCat);
                                        if (isSelected) {
                                          setStep(2);
                                        } else {
                                          setSelectedRoomId(r.id);
                                        }
                                      }}
                                      className={`p-3.5 rounded-2xl border flex flex-col justify-between transition-all duration-200 cursor-pointer select-none ${isSelected
                                          ? "selection-glow bg-indigo-950/70 border-indigo-500 shadow-glow ring-2 ring-indigo-500/40"
                                          : r.hasAvailability
                                            ? "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90"
                                            : "opacity-40 bg-slate-950 border-slate-900 cursor-not-allowed"
                                        }`}
                                    >
                                      <div className="space-y-2.5">
                                        {/* Room Number, Badges & Price */}
                                        <div className="flex items-start justify-between gap-2">
                                          <div>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="font-extrabold text-sm text-white">
                                                Room {r.roomNumber}
                                              </span>
                                              <Badge variant={r.isAC ? "cyan" : "coral"} size="sm">
                                                {r.isAC ? "🌬️ AC" : "⚡ Non-AC"}
                                              </Badge>
                                              {isSelected && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-300 bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 rounded-full">
                                                  <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                                                  Selected
                                                </span>
                                              )}
                                            </div>
                                            <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                                              Floor {r.floor} • {r.building}
                                            </span>
                                          </div>

                                          <div className="text-right shrink-0">
                                            <span className="text-base font-black text-white block">
                                              ₹{Math.round(price)}
                                            </span>
                                            <span className="text-[10px] text-slate-400 block -mt-0.5">
                                              {displayText}
                                            </span>
                                          </div>
                                        </div>

                                        {/* Clean Footer Row: Bed Count & Gender Tag */}
                                        <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/60">
                                          <span
                                            className={`font-semibold flex items-center gap-1.5 ${r.totalAvailableBeds > 0
                                                ? "text-emerald-400"
                                                : "text-slate-500"
                                              }`}
                                          >
                                            <span
                                              className={`w-1.5 h-1.5 rounded-full ${r.totalAvailableBeds > 0
                                                  ? "bg-emerald-400"
                                                  : "bg-slate-500"
                                                }`}
                                            />
                                            {r.totalAvailableBeds > 0
                                              ? `${r.totalAvailableBeds} beds available`
                                              : "Fully Occupied"}
                                          </span>

                                          <span className="text-[11px] font-medium text-slate-400">
                                            {r.roomType.genderCategory === "MIXED"
                                              ? "Mixed Co-ed"
                                              : r.roomType.genderCategory === "FEMALE"
                                                ? "Female Only"
                                                : "Male Only"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 2: Bed Allocation Picker */}
              {step === 2 && (
                <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800/80 bg-[#111827]/85 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-2xl font-black text-white">
                          Step 2: Choose Your Exact Bed
                        </h2>
                        <Badge variant="indigo" size="sm">
                          {getSharingCategoryName(selectedRoom)}
                        </Badge>
                        <Badge variant={selectedRoom?.isAC ? "cyan" : "coral"} size="sm">
                          {selectedRoom?.isAC ? "🌬️ AC" : "⚡ Non-AC"}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Type: <strong className="text-white">{selectedRoom?.roomType?.name}</strong> • Room {selectedRoom?.roomNumber} (Floor {selectedRoom?.floor}, {selectedRoom?.building})
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 self-start sm:self-center"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Change Room Type
                    </button>
                  </div>

                  {/* Rooms of the SAME type switcher */}
                  {roomsOfSameCategory.length > 1 && (
                    <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-200">
                          Available Rooms ({getSharingCategoryName(selectedRoom)}):
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {roomsOfSameCategory.filter((r) => r.hasAvailability).length} of {roomsOfSameCategory.length} rooms open
                        </span>
                      </div>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                        {roomsOfSameCategory.map((rm) => (
                          <button
                            key={rm.id}
                            type="button"
                            onClick={() => setSelectedRoomId(rm.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                              rm.id === selectedRoomId
                                ? "bg-indigo-600 text-white shadow-glow ring-2 ring-indigo-400"
                                : rm.hasAvailability
                                ? "bg-slate-800/90 text-slate-300 hover:bg-slate-700 border border-slate-700"
                                : "bg-slate-950/40 text-slate-600 border border-slate-800/60 cursor-not-allowed opacity-50"
                            }`}
                            disabled={!rm.hasAvailability}
                          >
                            Room {rm.roomNumber} (Floor {rm.floor}) • {rm.totalAvailableBeds} beds
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bed Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                    {selectedRoom?.beds?.map((bed: any) => {
                      const isAvail = bed.isAvailable;
                      const isSelected = selectedBedId === bed.id;
                      return (
                        <div
                          key={bed.id}
                          onClick={() => isAvail && setSelectedBedId(bed.id)}
                          className={`p-5 rounded-2xl border flex flex-col items-center text-center gap-3 transition ${isSelected
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
                      You have selected <strong className="text-white">{selectedBed?.bedNumber}</strong> ({selectedBed?.tier?.replace("_", " ")}) in <strong className="text-white">Room {selectedRoom?.roomNumber}</strong> ({getSharingCategoryName(selectedRoom)}). This bed will be reserved exclusively for your stay.
                    </span>
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => setStep(1)}
                      leftIcon={<ArrowLeft className="w-4 h-4" />}
                    >
                      Back to Rooms
                    </Button>
                    <Button
                      variant="glow"
                      size="lg"
                      onClick={() => {
                        if (!selectedBedId) return;
                        if (currentUser) {
                          setStep(3);
                        } else {
                          setIsAuthModalOpen(true);
                        }
                      }}
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
                      Your resident account details are used for check-in, official billing, and your instant QR pass.
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
                      <CustomSelect value={guestGender} onValueChange={setGuestGender} triggerClassName="rounded-xl border border-slate-700 bg-slate-900 p-3" options={[{ value: "MALE", label: "Male" }, { value: "FEMALE", label: "Female" }, { value: "OTHER", label: "Other / Non-Binary" }]} />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                        Government ID Type *
                      </label>
                      <CustomSelect
                        value={govtIdType}
                        onValueChange={(val) => {
                          setGovtIdType(val);
                          setGuestGovtId("");
                        }}
                        triggerClassName="rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm font-semibold text-white"
                        options={ID_OPTIONS}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400">
                          {ID_TYPE_CONFIG[govtIdType]?.label || "ID Number"} *
                        </label>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {ID_TYPE_CONFIG[govtIdType]?.helper}
                        </span>
                      </div>
                      <input
                        type="text"
                        placeholder={ID_TYPE_CONFIG[govtIdType]?.placeholder}
                        value={guestGovtId}
                        maxLength={ID_TYPE_CONFIG[govtIdType]?.maxLength}
                        onChange={handleGovtIdChange}
                        className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono font-semibold text-white focus:outline-none focus:border-indigo-500 tracking-wider placeholder:text-slate-600 uppercase"
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
                      Reserve Bed & Generate QR
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 4: Reservation summary */}
              {step === 4 && (
                <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-500/50 bg-[#111827]/95 space-y-6 shadow-2xl">
                  <div className="p-4 rounded-2xl bg-indigo-950/80 border border-indigo-500/40 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <p className="text-sm text-slate-200">{selectedBed?.bedNumber} is reserved. Payment is due; the QR pass is ready.</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white">
                      Reservation confirmed
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Booking Reference:{" "}
                      <span className="font-mono text-indigo-400 font-bold">
                        {createdBooking?.bookingReference}
                      </span>
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <p className="text-sm text-slate-300">Payment is marked due. Your bed is assigned and the QR pass is available on the confirmation page.</p>
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
                      View Reservation & QR
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
                  {stayType !== "MONTHLY" && <div className="flex justify-between"><span className="text-slate-400">Check-Out</span><span className="font-semibold text-white">{checkOut}</span></div>}
                  {stayType === "MONTHLY" && <div className="flex justify-between"><span className="text-slate-400">Stay term</span><span className="font-semibold text-white">Month-to-month</span></div>}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Room Type</span>
                    <span className="font-semibold text-white">
                      {selectedRoom?.roomType?.name || "Selecting..."}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Room</span>
                    <span className="font-semibold text-white">
                      {selectedRoom ? `Room ${selectedRoom.roomNumber} (${getSharingCategoryName(selectedRoom)})` : "Selecting..."}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Assigned Bed</span>
                    <span className="font-semibold text-indigo-400">
                      {selectedBed ? `${selectedBed.bedNumber} (${selectedBed.tier?.replace("_", " ")})` : "Select in Step 2"}
                    </span>
                  </div>
                </div>

                {/* Price Breakdown */}
                {pricing && (
                  <div className="space-y-2.5 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span>{stayType === "MONTHLY" ? "First month rent" : `Daily stay (${pricing.nights} ${pricing.nights === 1 ? "night" : "nights"})`}</span>
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
                      <span>{pricing.stayType === "MONTHLY" ? "Maintenance Fee" : "Service Fee"}</span>
                      <span className="font-semibold text-white">
                        ₹{pricing.serviceFee.toLocaleString()}
                      </span>
                    </div>

                    {pricing.securityDeposit > 0 && (
                      <div className="flex justify-between text-amber-300">
                        <span>Refundable Security Deposit</span>
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

                {/* Step 1 Quick Continue CTA in Sticky Sidebar */}
                {step === 1 && (
                  <Button
                    variant="glow"
                    size="lg"
                    className="w-full"
                    disabled={!selectedRoomId}
                    onClick={() => setStep(2)}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    {selectedRoom
                      ? `Continue to Beds (${getSharingCategoryName(selectedRoom)} • Room ${selectedRoom.roomNumber}) →`
                      : "Choose a Room to Continue"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Floating Action Bar for Step 1 */}
      {step === 1 && selectedRoom && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-[#0F172A]/95 border-t border-indigo-500/40 backdrop-blur-xl z-40 flex items-center justify-between gap-3 shadow-2xl">
          <div>
            <span className="font-black text-sm text-white block">
              {getSharingCategoryName(selectedRoom)} • Room {selectedRoom.roomNumber}
            </span>
            <span className="text-[11px] text-emerald-400 font-semibold block">
              {selectedRoom.totalAvailableBeds} beds available
            </span>
          </div>
          <Button
            variant="glow"
            size="md"
            onClick={() => setStep(2)}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Choose Bed
          </Button>
        </div>
      )}

      <Footer />

      <BookingAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        hostelName={activeHostel?.name}
        bedNumber={selectedBed?.bedNumber}
        roomTypeName={selectedRoom?.roomType?.name}
        nextPath={authResumeUrl}
      />
    </div>
  );
};

export default BookClient;
