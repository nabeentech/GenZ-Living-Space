"use client";

import React, { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import CustomSelect from "@/components/ui/CustomSelect";
import DatePicker from "@/components/ui/DatePicker";
import PaginationBar from "@/components/ui/PaginationBar";
import { compressImageToDataUrl } from "@/lib/image-compress";
import {
  CheckCircle2,
  AlertTriangle,
  Shield,
  Wrench,
  CreditCard,
  Car,
  Mail,
  Edit3,
  Clock,
  Receipt,
  Calendar,
  ArrowUpRight,
  X,
} from "lucide-react";

interface CustomerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string | null;
  canEdit?: boolean;
  onUpdated?: () => void;
}

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({
  isOpen,
  onClose,
  customerId,
  canEdit = true,
  onUpdated,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"timeline" | "edit" | "stays">("timeline");
  const [timelinePage, setTimelinePage] = useState(1);
  const timelinePageSize = 10;

  // Profile edit state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [govtIdType, setGovtIdType] = useState("AADHAAR");
  const [govtIdNumber, setGovtIdNumber] = useState("");
  const [hasVehicle, setHasVehicle] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [drivingLicenseNumber, setDrivingLicenseNumber] = useState("");
  const [aadhaarFrontImage, setAadhaarFrontImage] = useState<string | null>(null);
  const [aadhaarBackImage, setAadhaarBackImage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ src: string; label: string } | null>(null);
  const [address, setAddress] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Fee edit state (deposit / maintenance)
  const [editingFees, setEditingFees] = useState(false);
  const [editPaidDeposit, setEditPaidDeposit] = useState("");
  const [editPaidMaintenance, setEditPaidMaintenance] = useState("");
  const [syncBalanceOnFeeEdit, setSyncBalanceOnFeeEdit] = useState(true);
  const [savingFees, setSavingFees] = useState(false);
  const [feeError, setFeeError] = useState("");

  // Payment cycle edit state
  const [editingCycle, setEditingCycle] = useState(false);
  const [nextCycleDate, setNextCycleDate] = useState("");
  const [savingCycle, setSavingCycle] = useState(false);
  const [cycleError, setCycleError] = useState("");

  const loadLedger = async (id: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/customers/${id}/ledger`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load customer record");
      }
      setData(json.data);
      const c = json.data.customer;
      setName(c.name || "");
      setPhone(c.phone || "");
      setEmail(c.email || "");
      setGovtIdType(c.govtIdType && c.govtIdType !== "DRIVING_LICENSE" ? c.govtIdType : "AADHAAR");
      setGovtIdNumber(c.govtIdNumber || "");
      setAadhaarFrontImage(c.aadhaarFrontImage || null);
      setAadhaarBackImage(c.aadhaarBackImage || null);
      setHasVehicle(Boolean(c.hasVehicle));
      setVehicleNumber(c.vehicleNumber || "");
      setDrivingLicenseNumber(c.drivingLicenseNumber || "");
      setAddress(c.address || "");
      setEmergencyContact(c.emergencyContact || "");

      const active = json.data.activeBooking;
      if (active) {
        setEditPaidDeposit(String(active.paidSecurityDeposit ?? 0));
        setEditPaidMaintenance(String(active.paidMaintenanceFee ?? 0));
        setNextCycleDate(new Date(active.checkOutDate).toISOString().slice(0, 10));
      }
    } catch (err: any) {
      setError(err.message || "Could not load customer profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && customerId) {
      setActiveTab("timeline");
      setEditingFees(false);
      setEditingCycle(false);
      setProfileMsg(null);
      setFeeError("");
      setCycleError("");
      void loadLedger(customerId);
    } else {
      setData(null);
    }
  }, [isOpen, customerId]);

  const handleSaveCycle = async () => {
    if (!data?.activeBooking || !customerId || !canEdit || !nextCycleDate) return;
    setCycleError("");
    setSavingCycle(true);
    try {
      const res = await fetch(`/api/admin/bookings/${data.activeBooking.id}/payment-cycle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextDueDate: nextCycleDate }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not update payment cycle");
      }
      setEditingCycle(false);
      await loadLedger(customerId);
      onUpdated?.();
    } catch (err: any) {
      setCycleError(err.message || "Failed to update payment cycle");
    } finally {
      setSavingCycle(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !canEdit) return;
    setProfileMsg(null);

    if (govtIdType === "AADHAAR" && !/^\d{12}$/.test(govtIdNumber.trim())) {
      setProfileMsg({ type: "err", text: "Aadhaar number must be exactly 12 numeric digits." });
      return;
    }
    if (hasVehicle && !vehicleNumber.trim()) {
      setProfileMsg({ type: "err", text: "Vehicle number is required when customer has their own vehicle." });
      return;
    }
    if (hasVehicle && !drivingLicenseNumber.trim()) {
      setProfileMsg({ type: "err", text: "Driving license number is required when customer has their own vehicle." });
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email,
          govtIdType,
          govtIdNumber: govtIdNumber.trim(),
          aadhaarFrontImage,
          aadhaarBackImage,
          hasVehicle,
          vehicleNumber: hasVehicle ? vehicleNumber.trim().toUpperCase() : null,
          drivingLicenseNumber: hasVehicle ? drivingLicenseNumber.trim().toUpperCase() : null,
          address,
          emergencyContact,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not update profile");
      }
      setProfileMsg({ type: "ok", text: "Profile updated! Customer can now sign in with Google using this email." });
      await loadLedger(customerId);
      onUpdated?.();
    } catch (err: any) {
      setProfileMsg({ type: "err", text: err.message || "Failed to update profile" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveFees = async () => {
    if (!data?.activeBooking || !customerId || !canEdit) return;
    setFeeError("");
    const active = data.activeBooking;
    const depVal = Number(editPaidDeposit);
    const maintVal = Number(editPaidMaintenance);

    if (!Number.isFinite(depVal) || depVal < 0 || depVal > active.securityDeposit) {
      setFeeError(`Paid deposit must be between ₹0 and ₹${active.securityDeposit.toLocaleString("en-IN")}.`);
      return;
    }
    if (!Number.isFinite(maintVal) || maintVal < 0 || maintVal > active.serviceFee) {
      setFeeError(`Paid maintenance must be between ₹0 and ₹${active.serviceFee.toLocaleString("en-IN")}.`);
      return;
    }

    setSavingFees(true);
    try {
      const res = await fetch(`/api/admin/bookings/${active.id}/fees`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paidSecurityDeposit: depVal,
          paidMaintenanceFee: maintVal,
          syncBalance: syncBalanceOnFeeEdit,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update fee status");
      }
      setEditingFees(false);
      await loadLedger(customerId);
      onUpdated?.();
    } catch (err: any) {
      setFeeError(err.message || "Could not update fees");
    } finally {
      setSavingFees(false);
    }
  };

  const customer = data?.customer;
  const activeBooking = data?.activeBooking;
  const summary = data?.summary;
  const timeline = data?.timeline || [];

  const isPlaceholderEmail = !customer?.email || customer.email.endsWith("@genzlivingspace.local");
  const isValidAadhaar = customer?.govtIdType === "AADHAAR"
    ? /^\d{12}$/.test(customer?.govtIdNumber || "")
    : Boolean(customer?.govtIdNumber);
  const depositPending = activeBooking ? Math.max(0, (activeBooking.securityDeposit || 0) - (activeBooking.paidSecurityDeposit || 0)) : 0;
  const maintPending = activeBooking ? Math.max(0, (activeBooking.serviceFee || 0) - (activeBooking.paidMaintenanceFee || 0)) : 0;
  const vehicleOk = !customer?.hasVehicle || (Boolean(customer?.vehicleNumber) && Boolean(customer?.drivingLicenseNumber));

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Right Side Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={customer ? customer.name : "Customer Profile & Timeline"}
        className="relative z-10 flex h-dvh w-full sm:max-w-xl lg:max-w-2xl flex-col border-l border-slate-800 bg-[#0B0F19] shadow-2xl"
      >
        {/* Sticky Panel Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 bg-[#111827]/95 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400">
              Customer Profile &amp; Ledger
            </span>
            <h2 className="truncate text-xl font-black text-white mt-0.5">
              {customer ? customer.name : "Customer Profile & Timeline"}
            </h2>
            <p className="truncate text-xs text-slate-400 mt-0.5">
              {activeBooking
                ? `${activeBooking.hostel?.name || "Property"} · Rm ${activeBooking.room?.roomNumber || "—"} (${activeBooking.bed?.bedNumber || "—"}) · ${activeBooking.bookingReference}`
                : "Resident verification checklist & full payment timeline"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close side panel"
            className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-slate-400 hover:border-slate-600 hover:text-white transition shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Panel Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {loading && (
            <div className="py-12 text-center text-xs text-slate-400">Loading customer profile &amp; timeline...</div>
          )}

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/50 p-3 text-xs text-rose-200">
            {error}
          </div>
        )}

        {!loading && customer && (
          <>
            {/* Lifetime Financial Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Billed</div>
                <div className="mt-0.5 text-base font-black text-white">
                  ₹{(summary?.totalBilled || 0).toLocaleString("en-IN")}
                </div>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Total Paid</div>
                <div className="mt-0.5 text-base font-black text-emerald-300">
                  ₹{(summary?.totalPaid || 0).toLocaleString("en-IN")}
                </div>
              </div>
              <div className={`rounded-xl border p-3 ${(summary?.currentBalanceDue || 0) > 0 ? "border-amber-500/30 bg-amber-500/10" : "border-slate-800 bg-slate-900/80"}`}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Balance Due</div>
                <div className={`mt-0.5 text-base font-black ${(summary?.currentBalanceDue || 0) > 0 ? "text-amber-300" : "text-slate-300"}`}>
                  ₹{(summary?.currentBalanceDue || 0).toLocaleString("en-IN")}
                </div>
              </div>
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Deposit Held</div>
                <div className="mt-0.5 text-base font-black text-indigo-200">
                  ₹{(activeBooking?.paidSecurityDeposit || 0).toLocaleString("en-IN")}
                  <span className="text-[10px] font-normal text-slate-400">
                    {" "}/ ₹{(activeBooking?.securityDeposit || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {/* 5-Point Verification Checklist */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                  Resident Verification Checklist
                </span>
                {canEdit && activeBooking && (activeBooking.securityDeposit > 0 || activeBooking.serviceFee > 0) && (
                  <button
                    type="button"
                    onClick={() => setEditingFees((v) => !v)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 hover:text-amber-200 underline"
                  >
                    <Edit3 className="w-3 h-3" />
                    {editingFees ? "Cancel Fee Edit" : "Edit / Unpay Deposit & Maintenance"}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* 1. Security Deposit */}
                <div className={`flex items-center justify-between rounded-xl border p-2.5 ${depositPending === 0 ? "border-emerald-500/25 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/10"}`}>
                  <div className="flex items-center gap-2">
                    <Shield className={`w-4 h-4 shrink-0 ${depositPending === 0 ? "text-emerald-400" : "text-amber-400"}`} />
                    <div>
                      <div className="font-semibold text-white">Security Deposit</div>
                      <div className="text-[10px] text-slate-400">
                        Paid ₹{(activeBooking?.paidSecurityDeposit || 0).toLocaleString("en-IN")} / ₹{(activeBooking?.securityDeposit || 0).toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                  <Badge variant={depositPending === 0 ? "available" : "occupied"} size="sm">
                    {depositPending === 0 ? "Paid ✓" : `Due ₹${depositPending.toLocaleString("en-IN")}`}
                  </Badge>
                </div>

                {/* 2. Maintenance Fee */}
                <div className={`flex items-center justify-between rounded-xl border p-2.5 ${maintPending === 0 ? "border-emerald-500/25 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/10"}`}>
                  <div className="flex items-center gap-2">
                    <Wrench className={`w-4 h-4 shrink-0 ${maintPending === 0 ? "text-emerald-400" : "text-amber-400"}`} />
                    <div>
                      <div className="font-semibold text-white">Maintenance Fee</div>
                      <div className="text-[10px] text-slate-400">
                        Paid ₹{(activeBooking?.paidMaintenanceFee || 0).toLocaleString("en-IN")} / ₹{(activeBooking?.serviceFee || 0).toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                  <Badge variant={maintPending === 0 ? "available" : "occupied"} size="sm">
                    {maintPending === 0 ? "Paid ✓" : `Due ₹${maintPending.toLocaleString("en-IN")}`}
                  </Badge>
                </div>

                {/* 3. Aadhaar */}
                <div className={`flex items-center justify-between rounded-xl border p-2.5 ${isValidAadhaar ? "border-emerald-500/25 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/10"}`}>
                  <div className="flex items-center gap-2">
                    <CreditCard className={`w-4 h-4 shrink-0 ${isValidAadhaar ? "text-emerald-400" : "text-rose-400"}`} />
                    <div>
                      <div className="font-semibold text-white">Aadhaar / KYC</div>
                      <div className="text-[10px] font-mono text-slate-300">
                        {customer.govtIdNumber ? customer.govtIdNumber : "Not provided"}
                        {(customer.aadhaarFrontImage || customer.aadhaarBackImage) && (
                          <span className="ml-1.5 inline-flex gap-1.5 font-sans">
                            {customer.aadhaarFrontImage && (
                              <button
                                type="button"
                                onClick={() => setPreviewImage({ src: customer.aadhaarFrontImage, label: `${customer.name} · Aadhaar Front` })}
                                className="text-indigo-300 underline hover:text-indigo-200 font-semibold"
                              >
                                Front
                              </button>
                            )}
                            {customer.aadhaarBackImage && (
                              <button
                                type="button"
                                onClick={() => setPreviewImage({ src: customer.aadhaarBackImage, label: `${customer.name} · Aadhaar Back` })}
                                className="text-indigo-300 underline hover:text-indigo-200 font-semibold"
                              >
                                Back
                              </button>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {isValidAadhaar ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveTab("edit")}
                      className="text-[10px] font-bold text-rose-300 underline"
                    >
                      Add Aadhaar
                    </button>
                  )}
                </div>

                {/* 4. Vehicle */}
                <div className={`flex items-center justify-between rounded-xl border p-2.5 ${vehicleOk ? "border-emerald-500/25 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/10"}`}>
                  <div className="flex items-center gap-2">
                    <Car className={`w-4 h-4 shrink-0 ${vehicleOk ? "text-emerald-400" : "text-amber-400"}`} />
                    <div>
                      <div className="font-semibold text-white">Vehicle &amp; License</div>
                      <div className="text-[10px] text-slate-300">
                        {customer.hasVehicle
                          ? `${customer.vehicleNumber || "Missing No."}${customer.drivingLicenseNumber ? ` · DL: ${customer.drivingLicenseNumber}` : " · Missing DL"}`
                          : "No own vehicle"}
                      </div>
                    </div>
                  </div>
                  {vehicleOk ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                </div>
              </div>

              {/* 5. Google Login Email Status */}
              <div className={`flex items-center justify-between rounded-xl border p-2.5 text-xs ${!isPlaceholderEmail ? "border-emerald-500/25 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/10"}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className={`w-4 h-4 shrink-0 ${!isPlaceholderEmail ? "text-emerald-400" : "text-amber-400"}`} />
                  <div className="min-w-0">
                    <div className="font-semibold text-white">Google Sign-In Account</div>
                    <div className="text-[11px] text-slate-300 truncate">{customer.email}</div>
                  </div>
                </div>
                {!isPlaceholderEmail ? (
                  <Badge variant="available" size="sm">Google Login Ready ✓</Badge>
                ) : (
                  canEdit && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("edit")}
                      className="shrink-0 rounded-lg bg-amber-500/20 px-2.5 py-1 text-[11px] font-bold text-amber-200 hover:bg-amber-500/30"
                    >
                      Set Gmail
                    </button>
                  )
                )}
              </div>

              {/* 6. Monthly Payment Cycle Date */}
              {activeBooking && activeBooking.stayType === "MONTHLY" && ["CONFIRMED", "CHECKED_IN"].includes(activeBooking.bookingStatus) && (
                <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-2.5 text-xs space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-white">Monthly Payment Cycle</div>
                        <div className="text-[11px] text-slate-300">
                          Next Rent Due:{" "}
                          <strong className="text-indigo-200">
                            {new Date(activeBooking.checkOutDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </strong>
                        </div>
                      </div>
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setEditingCycle((v) => !v)}
                        className="shrink-0 rounded-lg bg-indigo-500/20 px-2.5 py-1 text-[11px] font-bold text-indigo-200 hover:bg-indigo-500/30"
                      >
                        {editingCycle ? "Cancel" : "Change Cycle Date"}
                      </button>
                    )}
                  </div>

                  {editingCycle && (
                    <div className="rounded-xl border border-indigo-500/30 bg-slate-950/90 p-3 space-y-2.5">
                      {cycleError && (
                        <div className="rounded-lg bg-rose-950/60 border border-rose-500/30 p-2 text-[11px] text-rose-200">
                          {cycleError}
                        </div>
                      )}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          New Next Rent Due Date (e.g. 1st of next month)
                        </label>
                        <DatePicker
                          value={nextCycleDate}
                          onChange={setNextCycleDate}
                          triggerClassName="p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs w-full"
                        />
                        <p className="mt-1 text-[10px] text-slate-400">
                          Future 30-day rent cycles will count from this new date.
                        </p>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setEditingCycle(false)} disabled={savingCycle}>
                          Cancel
                        </Button>
                        <Button type="button" variant="glow" size="sm" onClick={handleSaveCycle} isLoading={savingCycle}>
                          Save Cycle Date
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Inline Deposit & Maintenance Edit Panel */}
              {editingFees && activeBooking && (
                <div className="mt-2 rounded-xl border border-amber-500/40 bg-slate-950/90 p-3.5 space-y-3 text-xs">
                  <div className="font-bold text-amber-200">
                    Adjust Paid Deposit & Maintenance ({activeBooking.bookingReference})
                  </div>
                  {feeError && (
                    <div className="rounded-lg bg-rose-950/60 border border-rose-500/30 p-2 text-[11px] text-rose-200">
                      {feeError}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Deposit Paid (₹, Max ₹{activeBooking.securityDeposit.toLocaleString("en-IN")})
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editPaidDeposit}
                        onChange={(e) => setEditPaidDeposit(e.target.value.replace(/[^\d.]/g, ""))}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Maintenance Paid (₹, Max ₹{activeBooking.serviceFee.toLocaleString("en-IN")})
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editPaidMaintenance}
                        onChange={(e) => setEditPaidMaintenance(e.target.value.replace(/[^\d.]/g, ""))}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs text-white"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-300">
                    <input
                      type="checkbox"
                      checked={syncBalanceOnFeeEdit}
                      onChange={(e) => setSyncBalanceOnFeeEdit(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Update guest&apos;s balance due automatically for the unpaid difference</span>
                  </label>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditingFees(false)} disabled={savingFees}>
                      Cancel
                    </Button>
                    <Button type="button" variant="glow" size="sm" onClick={handleSaveFees} isLoading={savingFees}>
                      Save Fee Status
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 gap-2 flex-wrap">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab("timeline")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === "timeline" ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400 hover:text-white"}`}
                >
                  Payment Timeline ({timeline.length})
                </button>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("edit")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === "edit" ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400 hover:text-white"}`}
                  >
                    Edit Profile & Email
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveTab("stays")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === "stays" ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400 hover:text-white"}`}
                >
                  Stays ({data.bookings?.length || 0})
                </button>
              </div>

              {activeBooking && (
                <a
                  href={`/admin/payments?search=${encodeURIComponent(activeBooking.bookingReference)}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-2.5 py-1.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-600/30 transition"
                >
                  <span>Record Payment</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Tab 1: Complete Payment Timeline */}
            {activeTab === "timeline" && (
              <div className="space-y-2.5">
                {timeline.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">No financial events recorded yet.</div>
                ) : (
                  <div className="relative pl-5 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-slate-800">
                    {timeline
                      .slice((timelinePage - 1) * timelinePageSize, timelinePage * timelinePageSize)
                      .map((item: any) => {
                      const dotColor =
                        item.type === "PAYMENT" ? "bg-emerald-400" :
                        item.type === "REFUND" ? "bg-rose-400" :
                        item.type === "EXTENSION" ? "bg-indigo-400" :
                        item.type === "CHARGE" ? "bg-amber-400" :
                        "bg-slate-400";

                      return (
                        <div key={item.id} className="relative rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs">
                          <span className={`absolute -left-[17px] top-4 h-2.5 w-2.5 rounded-full ring-4 ring-[#0B0F19] ${dotColor}`} />
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold text-white flex items-center gap-2 flex-wrap">
                                <span>{item.title}</span>
                                <span className="text-[10px] font-mono text-slate-500">{item.bookingReference}</span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                                <Clock className="w-3 h-3 shrink-0" />
                                <span>
                                  {new Date(item.date).toLocaleString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                {item.subtitle && <span>· {item.subtitle}</span>}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              {typeof item.amount === "number" && (
                                <div className={`font-black text-sm ${item.type === "PAYMENT" ? "text-emerald-300" : item.type === "REFUND" ? "text-rose-300" : "text-white"}`}>
                                  {item.type === "PAYMENT" ? "+" : ""}₹{item.amount.toLocaleString("en-IN")}
                                </div>
                              )}
                              {item.status && (
                                <span className="text-[10px] font-semibold text-slate-400 uppercase">{item.status}</span>
                              )}
                            </div>
                          </div>

                          {item.allocation && (
                            <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-wrap gap-2 text-[10px] text-slate-300">
                              {item.allocation.depositAllocated > 0 && (
                                <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-indigo-200">
                                  Deposit: ₹{item.allocation.depositAllocated.toLocaleString("en-IN")}
                                </span>
                              )}
                              {item.allocation.cashForPast > 0 && (
                                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-200">
                                  Past Arrears: ₹{item.allocation.cashForPast.toLocaleString("en-IN")}
                                </span>
                              )}
                              {item.allocation.cashForCycleRent > 0 && (
                                <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-200">
                                  Cycle Rent: ₹{item.allocation.cashForCycleRent.toLocaleString("en-IN")}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <PaginationBar
                  currentPage={timelinePage}
                  totalItems={timeline.length}
                  pageSize={timelinePageSize}
                  onPageChange={setTimelinePage}
                  itemLabel="events"
                />
              </div>
            )}

            {/* Tab 2: Edit Profile & Email */}
            {activeTab === "edit" && canEdit && (
              <form onSubmit={handleSaveProfile} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-xs">
                {profileMsg && (
                  <div className={`rounded-xl border p-2.5 text-xs font-semibold ${profileMsg.type === "ok" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-rose-500/30 bg-rose-950/50 text-rose-200"}`}>
                    {profileMsg.text}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-[11px] font-semibold text-slate-300">Full Name *</span>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-semibold text-slate-300">Mobile Number (10 digits)</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-[11px] font-semibold text-slate-300">Email (Used for Google Sign-In) *</span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="customer@gmail.com"
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white"
                    />
                    <span className="mt-1 block text-[10px] text-slate-400">
                      Updating to their Gmail lets them sign in with Google and view/pay rent online.
                    </span>
                  </label>
                  <div>
                    <span className="block text-[11px] font-semibold text-slate-300 mb-1">Govt ID Type</span>
                    <CustomSelect
                      value={govtIdType}
                      onValueChange={setGovtIdType}
                      options={[
                        { value: "AADHAAR", label: "Aadhaar (12 digits)" },
                        { value: "PASSPORT", label: "Passport" },
                        { value: "VOTER_ID", label: "Voter ID" },
                      ]}
                      triggerClassName="p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs"
                    />
                  </div>
                  <label className="block">
                    <span className="text-[11px] font-semibold text-slate-300">
                      {govtIdType === "AADHAAR" ? "Aadhaar Number (12 digits) *" : "Govt ID Number *"}
                    </span>
                    <input
                      type="text"
                      required
                      inputMode={govtIdType === "AADHAAR" ? "numeric" : "text"}
                      maxLength={govtIdType === "AADHAAR" ? 12 : 50}
                      value={govtIdNumber}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGovtIdNumber(govtIdType === "AADHAAR" ? val.replace(/\D/g, "").slice(0, 12) : val);
                      }}
                      placeholder={govtIdType === "AADHAAR" ? "12-digit Aadhaar number" : "Enter ID number"}
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white"
                    />
                  </label>
                  <div>
                    <span className="block text-[11px] font-semibold text-slate-300 mb-1">Own Vehicle?</span>
                    <CustomSelect
                      value={hasVehicle ? "YES" : "NO"}
                      onValueChange={(val) => {
                        const yes = val === "YES";
                        setHasVehicle(yes);
                        if (!yes) {
                          setVehicleNumber("");
                          setDrivingLicenseNumber("");
                        }
                      }}
                      options={[
                        { value: "NO", label: "No Vehicle" },
                        { value: "YES", label: "Yes · Has Own Vehicle" },
                      ]}
                      triggerClassName="p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs"
                    />
                  </div>
                  {hasVehicle && (
                    <>
                      <label className="block">
                        <span className="text-[11px] font-semibold text-slate-300">Vehicle Number *</span>
                        <input
                          type="text"
                          required
                          maxLength={20}
                          value={vehicleNumber}
                          onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                          placeholder="e.g. KA-01-AB-1234"
                          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white uppercase"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[11px] font-semibold text-slate-300">Driving License Number *</span>
                        <input
                          type="text"
                          required
                          maxLength={30}
                          value={drivingLicenseNumber}
                          onChange={(e) => setDrivingLicenseNumber(e.target.value.toUpperCase())}
                          placeholder="e.g. KA01 20200012345"
                          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white uppercase"
                        />
                      </label>
                    </>
                  )}

                  <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <div>
                      <span className="block text-[11px] font-semibold text-slate-300 mb-1.5">Aadhaar Front Photo (Optional)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const dataUrl = await compressImageToDataUrl(file);
                            setAadhaarFrontImage(dataUrl);
                          } catch (err: any) {
                            setProfileMsg({ type: "err", text: err.message || "Could not upload Aadhaar front image." });
                          }
                        }}
                        className="block w-full text-[11px] text-slate-400 file:mr-2 file:rounded-lg file:border-0 file:bg-indigo-600/20 file:px-2.5 file:py-1 file:text-[11px] file:font-semibold file:text-indigo-200 hover:file:bg-indigo-600/30"
                      />
                      {aadhaarFrontImage && (
                        <div className="mt-2 flex items-center gap-2">
                          <button type="button" onClick={() => setPreviewImage({ src: aadhaarFrontImage, label: "Aadhaar Front" })} className="group relative overflow-hidden rounded-lg border border-slate-700 hover:border-indigo-400 transition">
                            <img src={aadhaarFrontImage} alt="Aadhaar front" className="h-12 w-20 object-cover" />
                            <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[9px] font-bold text-white transition">View</span>
                          </button>
                          <button type="button" onClick={() => setAadhaarFrontImage(null)} className="text-[10px] text-rose-300 underline">Remove</button>
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="block text-[11px] font-semibold text-slate-300 mb-1.5">Aadhaar Back Photo (Optional)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const dataUrl = await compressImageToDataUrl(file);
                            setAadhaarBackImage(dataUrl);
                          } catch (err: any) {
                            setProfileMsg({ type: "err", text: err.message || "Could not upload Aadhaar back image." });
                          }
                        }}
                        className="block w-full text-[11px] text-slate-400 file:mr-2 file:rounded-lg file:border-0 file:bg-indigo-600/20 file:px-2.5 file:py-1 file:text-[11px] file:font-semibold file:text-indigo-200 hover:file:bg-indigo-600/30"
                      />
                      {aadhaarBackImage && (
                        <div className="mt-2 flex items-center gap-2">
                          <button type="button" onClick={() => setPreviewImage({ src: aadhaarBackImage, label: "Aadhaar Back" })} className="group relative overflow-hidden rounded-lg border border-slate-700 hover:border-indigo-400 transition">
                            <img src={aadhaarBackImage} alt="Aadhaar back" className="h-12 w-20 object-cover" />
                            <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[9px] font-bold text-white transition">View</span>
                          </button>
                          <button type="button" onClick={() => setAadhaarBackImage(null)} className="text-[10px] text-rose-300 underline">Remove</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <label className="block">
                    <span className="text-[11px] font-semibold text-slate-300">Emergency Contact</span>
                    <input
                      type="text"
                      maxLength={100}
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      placeholder="Parent / Guardian phone"
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-semibold text-slate-300">Permanent Address</span>
                    <input
                      type="text"
                      maxLength={250}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Home city / address"
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white"
                    />
                  </label>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" variant="glow" size="sm" isLoading={savingProfile}>
                    Save Profile Changes
                  </Button>
                </div>
              </form>
            )}

            {/* Tab 3: Stays & Invoices */}
            {activeTab === "stays" && (
              <div className="space-y-2.5">
                {(data.bookings || []).map((b: any) => (
                  <div key={b.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white">{b.hostel?.name || "Hostel"}</span>
                        <span className="ml-2 font-mono text-[10px] text-indigo-300">{b.bookingReference}</span>
                      </div>
                      <Badge
                        variant={b.bookingStatus === "CHECKED_OUT" ? "available" : b.bookingStatus === "CHECKED_IN" ? "occupied" : "reserved"}
                        size="sm"
                      >
                        {b.bookingStatus}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Room {b.room?.roomNumber || "—"} · {b.bed?.bedNumber || "—"} · {b.stayType}</span>
                      <span>
                        Paid <strong className="text-emerald-300">₹{b.paidAmount.toLocaleString("en-IN")}</strong> / ₹{b.totalAmount.toLocaleString("en-IN")}
                        {b.balanceAmount > 0 && (
                          <span className="text-amber-300"> (Due ₹{b.balanceAmount.toLocaleString("en-IN")})</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {new Date(b.checkInDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                        {" → "}
                        {new Date(b.checkOutDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                      </span>
                      <Receipt className="w-3 h-3 ml-2" />
                      <span>{b.invoices?.length || 0} invoices</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        </div>
      </aside>

      {previewImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-2xl w-full rounded-2xl border border-slate-700 bg-[#0B0F19] p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">{previewImage.label}</span>
              <button type="button" onClick={() => setPreviewImage(null)} className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700">Close</button>
            </div>
            <img src={previewImage.src} alt={previewImage.label} className="w-full max-h-[75vh] object-contain rounded-xl bg-black" />
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerProfileModal;
