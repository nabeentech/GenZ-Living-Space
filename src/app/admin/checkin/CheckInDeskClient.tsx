"use client";

import React, { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import CustomSelect from "@/components/ui/CustomSelect";
import {
  QrCode,
  Search,
  CheckCircle2,
  MapPin,
  Clock,
  User,
  ShieldCheck,
  AlertCircle,
  Plus,
  Trash2,
  ArrowRight,
  LogOut,
  Camera,
} from "lucide-react";

interface CheckInDeskClientProps {
  expectedCheckIns: any[];
  currentResidents: any[];
}

export const CheckInDeskClient: React.FC<CheckInDeskClientProps> = ({
  expectedCheckIns: initialExpected,
  currentResidents: initialResidents,
}) => {
  const [expectedCheckIns, setExpectedCheckIns] = useState(initialExpected);
  const [currentResidents, setCurrentResidents] = useState(initialResidents);

  const [activeTab, setActiveTab] = useState<"checkin" | "checkout">("checkin");
  const [searchRef, setSearchRef] = useState("");
  const [lookupResult, setLookupResult] = useState<any | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerControlsRef = useRef<{ stop: () => void } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check-In Modal State
  const [activeCheckInBooking, setActiveCheckInBooking] = useState<any | null>(null);
  const [governmentId, setGovernmentId] = useState("");
  const [govtIdVerified, setGovtIdVerified] = useState(true);
  const [checkInPaymentMethod, setCheckInPaymentMethod] = useState<string>("cash");
  const [settlePaymentConfirmed, setSettlePaymentConfirmed] = useState<boolean>(true);
  const [isProcessingCheckIn, setIsProcessingCheckIn] = useState(false);
  const [checkInSuccessMsg, setCheckInSuccessMsg] = useState("");

  // Check-Out Modal State
  const [activeCheckOutBooking, setActiveCheckOutBooking] = useState<any | null>(null);
  const [extraCharges, setExtraCharges] = useState<
    { category: string; description: string; amount: number }[]
  >([]);
  const [newChargeCategory, setNewChargeCategory] = useState("LAUNDRY");
  const [newChargeAmount, setNewChargeAmount] = useState(150);
  const [newChargeDesc, setNewChargeDesc] = useState("Floor 2 Laundry wash & dry");
  const [isProcessingCheckOut, setIsProcessingCheckOut] = useState(false);
  const [checkOutSuccessMsg, setCheckOutSuccessMsg] = useState("");

  useEffect(() => {
    setGovernmentId(activeCheckInBooking?.guestGovtId || "");
  }, [activeCheckInBooking]);

  const lookupBooking = async (rawValue: string) => {
    let query = rawValue.trim();
    if (!query) return;

  // Booking QR codes contain a JSON payload; USB scanners may paste it directly.
    try {
      const payload = JSON.parse(query);
      query = String(payload.ref || payload.id || query);
    } catch {
      // Plain booking references remain supported.
    }

    query = query.toUpperCase();
    if (!query) return;

    // Check in expected or residents first
    const found =
      expectedCheckIns.find((b) => b.bookingReference.toUpperCase() === query) ||
      currentResidents.find((b) => b.bookingReference.toUpperCase() === query);

    if (found) {
      setLookupResult(found);
      if (found.bookingStatus === "CONFIRMED") {
        setActiveCheckInBooking(found);
      } else if (found.bookingStatus === "CHECKED_IN") {
        setActiveCheckOutBooking(found);
      }
    } else {
      // Fallback to server-side lookup if not found locally
      try {
        const res = await fetch(`/api/admin/bookings/lookup?q=${encodeURIComponent(query)}`);
        const json = await res.json();

        if (json.success && json.data) {
          setLookupResult(json.data);
          if (json.data.bookingStatus === "CONFIRMED") {
            setActiveCheckInBooking(json.data);
          } else if (json.data.bookingStatus === "CHECKED_IN") {
            setActiveCheckOutBooking(json.data);
          }
        } else {
          alert(json.message || `No active booking found for reference ${query}`);
        }
      } catch (err) {
        alert(`No active booking found for reference ${query}`);
      }
    }
  };

  // Manual or QR lookup
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    await lookupBooking(searchRef);
  };

  const stopScanner = () => {
    try {
      scannerControlsRef.current?.stop();
    } catch (e) {
      console.warn("Failed to stop scanner controls", e);
    }
    scannerControlsRef.current = null;
    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    } catch (e) {
      console.warn("Failed to stop stream tracks", e);
    }
    streamRef.current = null;
    setIsScanning(false);
  };

  const startScanner = () => {
    setScanError("");
    setIsScanning(true);
  };

  // Live Camera Scanner Lifecycle: runs after <video> mounts into DOM
  useEffect(() => {
    if (!isScanning) return;
    let active = true;
    let controls: any = null;

    const startCamera = async () => {
      setScanError("");

      if (typeof window !== "undefined" && !navigator?.mediaDevices?.getUserMedia) {
        setScanError(
          "Live camera stream requires HTTPS or localhost. If you are accessing via local Wi-Fi (http://...), please use the 'Snap Photo' button or enter the booking reference manually."
        );
        setIsScanning(false);
        return;
      }

      if (!videoRef.current) return;

      try {
        const reader = new BrowserQRCodeReader();
        controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          },
          videoRef.current,
          (result) => {
            if (!result || !active) return;
            const value = result.getText();
            setSearchRef(value);
            lookupBooking(value);
            stopScanner();
          }
        );

        if (!active) {
          controls?.stop();
        } else {
          scannerControlsRef.current = controls;
        }
      } catch (err: any) {
        if (!active) return;
        console.error("Camera access error:", err);
        setIsScanning(false);
        if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
          setScanError("Camera permission denied. Allow camera permissions in your browser or use 'Snap Photo'.");
        } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
          setScanError("No camera found on this device.");
        } else {
          setScanError("Camera access failed: " + (err?.message || "Please check camera permissions or HTTPS connection."));
        }
      }
    };

    startCamera();

    return () => {
      active = false;
      controls?.stop();
    };
  }, [isScanning]);

  // Decode QR from snapped photo or uploaded image (works 100% on mobile HTTP & HTTPS)
  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanError("");
    const url = URL.createObjectURL(file);
    try {
      const reader = new BrowserQRCodeReader();
      const result = await reader.decodeFromImageUrl(url);
      if (result) {
        const value = result.getText();
        setSearchRef(value);
        lookupBooking(value);
      } else {
        setScanError("Could not detect a QR code in the selected photo. Make sure the QR code is centered and in focus.");
      }
    } catch (err: any) {
      console.error("Photo QR decode error:", err);
      setScanError("No QR code found in photo. Make sure the QR is clearly visible with good lighting.");
    } finally {
      URL.revokeObjectURL(url);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => stopScanner, []);

  // Perform Check-in
  const handleConfirmCheckIn = async () => {
    if (!activeCheckInBooking) return;
    setIsProcessingCheckIn(true);
    setCheckInSuccessMsg("");

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: activeCheckInBooking.id,
          bookingReference: activeCheckInBooking.bookingReference,
          guestGovtId: governmentId.trim(),
          guestGovtIdVerified: govtIdVerified,
          settlePayment: activeCheckInBooking.paymentStatus !== "PAID" ? settlePaymentConfirmed : false,
          paymentMethod: checkInPaymentMethod,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Check-in failed");
      }

      setCheckInSuccessMsg(json.message);
      // Move from expected to residents
      setExpectedCheckIns((prev) =>
        prev.filter((b) => b.id !== activeCheckInBooking.id)
      );
      setCurrentResidents((prev) => [json.data, ...prev]);

      setTimeout(() => {
        setActiveCheckInBooking(null);
        setCheckInSuccessMsg("");
        setSearchRef("");
      }, 2000);
    } catch (err: any) {
      alert(err.message || "Failed to check in");
    } finally {
      setIsProcessingCheckIn(false);
    }
  };

  // Add extra charge at checkout
  const handleAddExtraCharge = () => {
    if (newChargeAmount <= 0) return;
    setExtraCharges([
      ...extraCharges,
      {
        category: newChargeCategory,
        description: newChargeDesc,
        amount: Number(newChargeAmount),
      },
    ]);
    setNewChargeDesc("");
    setNewChargeAmount(0);
  };

  // Perform Check-out
  const handleConfirmCheckOut = async () => {
    if (!activeCheckOutBooking) return;
    setIsProcessingCheckOut(true);
    setCheckOutSuccessMsg("");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: activeCheckOutBooking.id,
          additionalCharges: extraCharges,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Check-out failed");
      }

      setCheckOutSuccessMsg(json.message);
      setCurrentResidents((prev) =>
        prev.filter((b) => b.id !== activeCheckOutBooking.id)
      );

      setTimeout(() => {
        setActiveCheckOutBooking(null);
        setCheckOutSuccessMsg("");
        setExtraCharges([]);
        setSearchRef("");
      }, 2000);
    } catch (err: any) {
      alert(err.message || "Failed to check out");
    } finally {
      setIsProcessingCheckOut(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Scanner & Quick Lookup Bar */}
      <div className="glass-panel p-6 rounded-3xl border border-indigo-500/40 bg-[#111827]/90 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">
              Instant QR / Booking Reference Lookup
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Scan with USB QR scanner or type reference
          </span>
        </div>

        <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="e.g. GZ-829104 (or paste QR string)"
              value={searchRef}
              onChange={(e) => setSearchRef(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono font-bold text-white uppercase focus:outline-none focus:border-indigo-500"
            />
          </div>
          <Button variant="glow" size="lg" type="submit">
            Lookup Guest
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="lg"
              type="button"
              onClick={isScanning ? stopScanner : startScanner}
              leftIcon={<QrCode className="w-4 h-4" />}
            >
              {isScanning ? "Stop Scanner" : "Live Camera"}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              leftIcon={<Camera className="w-4 h-4" />}
            >
              Snap Photo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileScan}
            />
          </div>
        </form>
        {isScanning && (
          <div className="relative overflow-hidden rounded-2xl border border-indigo-500/50 bg-black max-w-sm">
            <video ref={videoRef} autoPlay muted playsInline className="w-full aspect-video object-cover" />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-36 border-2 border-dashed border-cyan-400 rounded-xl relative shadow-glow">
                <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-pink-400 shadow-glow animate-pulse" />
              </div>
            </div>
            <div className="absolute bottom-2 inset-x-0 text-center pointer-events-none">
              <span className="text-[11px] font-semibold bg-black/80 px-2.5 py-1 rounded-full text-slate-200 border border-slate-700">
                Point camera at guest QR code
              </span>
            </div>
          </div>
        )}
        {scanError && (
          <p className="text-xs text-amber-300 bg-amber-950/40 p-3 rounded-xl border border-amber-800/60 leading-relaxed">
            {scanError}
          </p>
        )}
      </div>

      {/* Tabs: Expected Check-Ins vs Current Residents (Check-Out) */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("checkin")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "checkin"
              ? "bg-indigo-600 text-white shadow-glow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Arrivals & Check-Ins ({expectedCheckIns.length})
        </button>
        <button
          onClick={() => setActiveTab("checkout")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "checkout"
              ? "bg-indigo-600 text-white shadow-glow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Departures & Check-Outs ({currentResidents.length})
        </button>
      </div>

      {/* TAB 1: EXPECTED CHECK-INS */}
      {activeTab === "checkin" && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-[#111827]/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">
              Confirmed Arrivals Awaiting Check-In
            </h3>
            <span className="text-xs text-slate-400">
              {expectedCheckIns.length} reservations
            </span>
          </div>

          {expectedCheckIns.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              All arrivals for today have been checked in!
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {expectedCheckIns.map((b) => (
                <div
                  key={b.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-white">
                        {b.bookingReference}
                      </span>
                      <Badge variant="available" size="sm">
                        {b.paymentStatus}
                      </Badge>
                      <Badge variant="indigo" size="sm">
                        {b.hostel.city}
                      </Badge>
                    </div>
                    <h4 className="text-base font-bold text-white">
                      {b.guestName}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {b.hostel.name} • Room {b.room.roomNumber} (
                      <strong className="text-indigo-400">{b.bed.bedNumber}</strong>)
                    </p>
                    <p className="text-xs text-slate-500">
                      Stay: {new Date(b.checkInDate).toLocaleDateString()} to{" "}
                      {new Date(b.checkOutDate).toLocaleDateString()} • Contact:{" "}
                      {b.guestPhone}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="glow"
                      size="sm"
                      onClick={() => setActiveCheckInBooking(b)}
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      Process Check-In
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CURRENT RESIDENTS (CHECK-OUT) */}
      {activeTab === "checkout" && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-[#111827]/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">
              Currently Checked-In Residents
            </h3>
            <span className="text-xs text-slate-400">
              {currentResidents.length} in-house
            </span>
          </div>

          {currentResidents.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No checked-in residents currently.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {currentResidents.map((b) => (
                <div
                  key={b.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-white">
                        {b.bookingReference}
                      </span>
                      <Badge variant="indigo" size="sm">
                        IN-HOUSE
                      </Badge>
                      <span className="text-xs text-slate-400 font-medium">
                        Room {b.room.roomNumber} ({b.bed.bedNumber})
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-white">
                      {b.guestName}
                    </h4>
                    <p className="text-xs text-slate-400">
                      Check-In: {b.checkInTime ? new Date(b.checkInTime).toLocaleString() : "Checked In"} by {b.checkedInBy || "Reception"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setActiveCheckOutBooking(b);
                        setExtraCharges([]);
                      }}
                      rightIcon={<LogOut className="w-4 h-4" />}
                    >
                      Process Check-Out
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Check-In Confirmation Modal */}
      {activeCheckInBooking && (
        <Modal
          isOpen={!!activeCheckInBooking}
          onClose={() => setActiveCheckInBooking(null)}
          title="Reception Check-In Verification"
          description={`Ref #${activeCheckInBooking.bookingReference}`}
        >
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Resident Name:</span>
                <span className="font-bold text-white">
                  {activeCheckInBooking.guestName}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-400">Gender:</span>
                  <span className="font-bold text-indigo-300">
                    {activeCheckInBooking.guestGender || "Not specified"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Age:</span>
                  <span className="font-bold text-indigo-300">
                    {activeCheckInBooking.guestDateOfBirth
                      ? `${Math.floor((new Date().getTime() - new Date(activeCheckInBooking.guestDateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} years`
                      : "Not specified"}
                  </span>
                </div>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-800">
                <span className="text-slate-400">Mobile / WhatsApp:</span>
                <span className="font-bold text-white">
                  {activeCheckInBooking.guestPhone}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Allocated Room & Bed:</span>
                <span className="font-bold text-indigo-400">
                  Room {activeCheckInBooking.room.roomNumber} •{" "}
                  {activeCheckInBooking.bed.bedNumber}
                </span>
              </div>
              {/* Payment Status & Collection */}
              {activeCheckInBooking.paymentStatus === "PAID" ? (
                <div className="flex justify-between items-center p-2 rounded-xl bg-emerald-950/30 border border-emerald-500/20">
                  <span className="text-slate-400">Payment Status:</span>
                  <span className="font-bold text-emerald-400">
                    PAID IN FULL (₹{activeCheckInBooking.paidAmount.toLocaleString()})
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-amber-300 font-semibold">Payment Due at Reception:</span>
                    <span className="font-black text-white text-sm">
                      ₹{(activeCheckInBooking.balanceAmount || activeCheckInBooking.totalAmount).toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Payment Mode Received:
                    </label>
                    <select
                      value={checkInPaymentMethod}
                      onChange={(e) => setCheckInPaymentMethod(e.target.value)}
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="cash">Cash at Reception Desk</option>
                      <option value="upi">UPI / QR Code Scan</option>
                      <option value="card">Credit / Debit Card POS</option>
                      <option value="bank_transfer">Direct Bank Transfer</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-amber-200">
                    <input
                      type="checkbox"
                      checked={settlePaymentConfirmed}
                      onChange={(e) => setSettlePaymentConfirmed(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <span>
                      Collect payment and mark reservation settled & paid in full
                    </span>
                  </label>
                </div>
              )}
              <div className="space-y-1 pt-2 border-t border-slate-800">
                <label className="text-slate-400 block" htmlFor="government-id">
                  Government ID Number:
                </label>
                <input
                  id="government-id"
                  type="text"
                  value={governmentId}
                  onChange={(e) => setGovernmentId(e.target.value)}
                  placeholder="Aadhaar, Passport, DL, or Voter ID"
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Govt ID verification checkbox */}
            <label className="flex items-center gap-3 p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 cursor-pointer text-xs text-slate-200">
              <input
                type="checkbox"
                checked={govtIdVerified}
                onChange={(e) => setGovtIdVerified(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>
                Physical Government ID (Aadhaar / Passport / DL) verified and biometric keycard issued to resident.
              </span>
            </label>

            {checkInSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-500 text-xs text-emerald-300">
                {checkInSuccessMsg}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveCheckInBooking(null)}
                disabled={isProcessingCheckIn}
              >
                Cancel
              </Button>
              <Button
                variant="glow"
                size="sm"
                isLoading={isProcessingCheckIn}
                onClick={handleConfirmCheckIn}
                disabled={
                  !governmentId.trim() ||
                  !govtIdVerified ||
                  (activeCheckInBooking.paymentStatus !== "PAID" && !settlePaymentConfirmed)
                }
                rightIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Confirm & Check-In
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Check-Out & Additional Charges Modal */}
      {activeCheckOutBooking && (
        <Modal
          isOpen={!!activeCheckOutBooking}
          onClose={() => setActiveCheckOutBooking(null)}
          title="Process Resident Check-Out"
          description={`Resident: ${activeCheckOutBooking.guestName} (Room ${activeCheckOutBooking.room.roomNumber}, ${activeCheckOutBooking.bed.bedNumber})`}
        >
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-1">
              <span className="font-bold text-white block">Checkout Notice:</span>
              <p className="text-slate-300">
                Completing checkout will release bed{" "}
                <strong className="text-indigo-400">
                  {activeCheckOutBooking.bed.bedNumber}
                </strong>{" "}
                to the Housekeeping cleaning queue and mark status as CLEANING.
              </p>
            </div>

            {/* Additional Charges Section */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400">
                Record Additional Charges (Optional)
              </label>

              <div className="grid grid-cols-3 gap-2">
                <CustomSelect value={newChargeCategory} onValueChange={setNewChargeCategory} options={[{ value: "LAUNDRY", label: "Laundry" }, { value: "FOOD", label: "Cafe / Food" }, { value: "LOST_KEY", label: "Lost Keycard" }, { value: "DAMAGE", label: "Damages" }, { value: "LATE_CHECKOUT", label: "Late Checkout" }, { value: "OTHER", label: "Other" }]} triggerClassName="p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs" />

                <input
                  type="number"
                  placeholder="Amount ₹"
                  value={newChargeAmount || ""}
                  onChange={(e) => setNewChargeAmount(Number(e.target.value))}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none"
                />

                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={handleAddExtraCharge}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add Charge
                </Button>
              </div>

              {extraCharges.length > 0 && (
                <div className="space-y-1 pt-2">
                  <span className="text-[11px] font-bold text-slate-400 block">
                    Tally to be settled:
                  </span>
                  {extraCharges.map((ch, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 text-xs text-slate-300"
                    >
                      <span>
                        {ch.category}: {ch.description || "Charge"}
                      </span>
                      <span className="font-bold text-white">₹{ch.amount}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {checkOutSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-500 text-xs text-emerald-300">
                {checkOutSuccessMsg}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveCheckOutBooking(null)}
                disabled={isProcessingCheckOut}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                size="sm"
                isLoading={isProcessingCheckOut}
                onClick={handleConfirmCheckOut}
                rightIcon={<LogOut className="w-4 h-4" />}
              >
                Confirm Check-Out
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CheckInDeskClient;
