"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DollarSign, Save, AlertCircle, CheckCircle, Wind, Snowflake } from "lucide-react";
import Button from "@/components/ui/Button";
import { SHARING_NAMES, SHARING_DESCRIPTIONS } from "@/lib/room-types";

interface PricingTierGridProps {
  roomTypeId: string;
  roomTypeName: string;
  pricingData: Record<string, any>;
  acType: "AC" | "NonAC";
  canEdit: boolean;
  onPriceChange: (roomTypeId: string, field: string, value: string) => void;
}

// Top-level stable component prevents unmounting inputs on every keystroke
const PricingTierGrid: React.FC<PricingTierGridProps> = React.memo(({
  roomTypeId,
  roomTypeName,
  pricingData,
  acType,
  canEdit,
  onPriceChange,
}) => {
  const prefix = acType === "AC" ? "AC" : "NonAC";
  const tiers = [
    { key: `pricePerDay${prefix}`, label: "1-DAY", duration: "1 Day", emoji: "💰" },
    { key: `price7Days${prefix}`, label: "7-DAY", duration: "1 Week", emoji: "📅" },
    { key: `price10Days${prefix}`, label: "10-DAY", duration: "10 Days", emoji: "📊" },
    { key: `price15Days${prefix}`, label: "15-DAY", duration: "15 Days", emoji: "📆" },
    { key: `price30Days${prefix}`, label: "30-DAY", duration: "1 Month", emoji: "📋" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {tiers.map((tier) => {
        const val = pricingData[tier.key] ?? "";
        return (
          <div key={tier.key} className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide">
              <span className="mr-1.5">{tier.emoji}</span>{tier.label}
              <div className="text-slate-500 font-normal text-[10px] mt-0.5">({tier.duration})</div>
            </label>
            <div className="flex items-center gap-1.5 bg-slate-900 rounded-lg border border-slate-700 px-2.5 py-2 focus-within:border-indigo-500 transition">
              <span className="text-slate-500 font-semibold text-sm">₹</span>
              <input
                type="text"
                inputMode="decimal"
                disabled={!canEdit}
                value={val}
                onChange={(e) =>
                  onPriceChange(roomTypeId, tier.key, e.target.value)
                }
                className="flex-1 bg-transparent text-white text-sm font-bold focus:outline-none placeholder:text-slate-600 disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="0.00"
                aria-label={`${roomTypeName} ${tier.label} ${acType} price`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
});

PricingTierGrid.displayName = "PricingTierGrid";

export default function PricingManagementClient({ canEdit = true }: { canEdit?: boolean }) {
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadRoomTypes();
  }, []);

  const loadRoomTypes = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/room-types");
      const json = await res.json();
      if (json.success && json.data) {
        const sorted = [...json.data].sort(
          (a, b) => (a.totalBeds || 0) - (b.totalBeds || 0)
        );
        setRoomTypes(sorted);
      } else {
        setError("Failed to load room types");
      }
    } catch (err: any) {
      setError(err.message || "Error loading room types");
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = useCallback(
    (roomTypeId: string, field: string, value: string) => {
      // Allow empty string, integers, and decimals
      if (value !== "" && !/^\d*(\.\d*)?$/.test(value)) return;
      setRoomTypes((prev) =>
        prev.map((rt) =>
          rt.id === roomTypeId ? { ...rt, [field]: value } : rt
        )
      );
    },
    []
  );

  const handleSave = async (roomTypeId: string) => {
    try {
      setSaving(roomTypeId);
      setError(null);
      setSuccess(null);

      const roomType = roomTypes.find((rt) => rt.id === roomTypeId);
      if (!roomType) return;

      const displayName = SHARING_NAMES[roomType.totalBeds] || roomType.name;

      const pricingFields = [
        "pricePerDayNonAC", "price7DaysNonAC", "price10DaysNonAC", "price15DaysNonAC", "price30DaysNonAC",
        "pricePerDayAC", "price7DaysAC", "price10DaysAC", "price15DaysAC", "price30DaysAC",
      ];
      const prices: Record<string, number> = {};
      for (const field of pricingFields) {
        const value = roomType[field];
        if (value === "" || !Number.isFinite(Number(value)) || Number(value) < 0) {
          throw new Error("Enter a valid non-negative amount for every pricing tier.");
        }
        prices[field] = Number(value);
      }

      const res = await fetch(`/api/admin/room-types/${roomTypeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prices),
      });

      const json = await res.json();
      if (json.success) {
        setRoomTypes((prev) =>
          prev.map((rt) => (rt.id === roomTypeId ? json.data : rt))
        );
        setSuccess(`${displayName} pricing updated successfully!`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(json.message || "Failed to save pricing");
      }
    } catch (err: any) {
      setError(err.message || "Error saving pricing");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <DollarSign className="w-12 h-12 mx-auto text-indigo-400 mb-4 animate-pulse" />
          <p className="text-slate-300">Loading pricing data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-white mb-2">Pricing Management</h1>
        <p className="text-slate-400">Configure AC and Non-AC room pricing by duration</p>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex gap-3 items-start">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <span className="text-emerald-300">{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 items-start">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <span className="text-red-300">{error}</span>
        </div>
      )}

      <div className="space-y-4">
        {roomTypes.map((roomType) => {
          const displayName = SHARING_NAMES[roomType.totalBeds] || roomType.name;
          const displayDesc = SHARING_DESCRIPTIONS[roomType.totalBeds] || roomType.description;

          return (
            <div
              key={roomType.id}
              className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden"
            >
              {/* Header - Click to Expand */}
              <div
                onClick={() =>
                  setExpandedId(expandedId === roomType.id ? null : roomType.id)
                }
                className="p-6 cursor-pointer hover:bg-slate-800/30 transition flex items-center justify-between"
              >
                <div>
                  <h3 className="font-bold text-white text-xl">{displayName}</h3>
                  <p className="text-sm text-slate-400 mt-2">{displayDesc}</p>
                  <p className="text-xs text-slate-500 mt-1">Capacity: {roomType.totalBeds} bed(s)</p>
                </div>
                <div className="text-right flex flex-col gap-2">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Non-AC (1-day)</div>
                    <div className="font-bold text-indigo-400 text-lg">
                      ₹{Math.round(roomType.pricePerDayNonAC || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">AC (1-day)</div>
                    <div className="font-bold text-cyan-400 text-lg">
                      ₹{Math.round(roomType.pricePerDayAC || 0)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedId === roomType.id && (
                <div className="p-6 bg-slate-950/60 border-t border-slate-800 space-y-8">
                  {/* Non-AC Section */}
                  <div className="space-y-5">
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-700/50">
                      <Wind className="w-5 h-5 text-indigo-400" />
                      <h4 className="font-bold text-white text-lg">Non-AC Pricing</h4>
                    </div>
                    <PricingTierGrid
                      roomTypeId={roomType.id}
                      roomTypeName={displayName}
                      pricingData={roomType}
                      acType="NonAC"
                      canEdit={canEdit}
                      onPriceChange={handlePriceChange}
                    />
                  </div>

                  {/* AC Section */}
                  <div className="space-y-5">
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-700/50">
                      <Snowflake className="w-5 h-5 text-cyan-400" />
                      <h4 className="font-bold text-white text-lg">AC Pricing</h4>
                    </div>
                    <PricingTierGrid
                      roomTypeId={roomType.id}
                      roomTypeName={displayName}
                      pricingData={roomType}
                      acType="AC"
                      canEdit={canEdit}
                      onPriceChange={handlePriceChange}
                    />
                  </div>

                  {/* Save Button */}
                  <div className="pt-6 border-t border-slate-700/50 flex justify-end">
                    {canEdit ? (
                      <Button
                        variant="glow"
                        size="lg"
                        onClick={() => handleSave(roomType.id)}
                        disabled={saving === roomType.id}
                        leftIcon={
                          saving === roomType.id ? (
                            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )
                        }
                      >
                        {saving === roomType.id ? "Saving Changes..." : "Save Pricing"}
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-500 font-semibold px-4 py-2 rounded-xl bg-slate-900 border border-slate-800">
                        View-Only Rate Card
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Help Section */}
      <div className="mt-12 p-6 rounded-2xl bg-blue-500/5 border border-blue-500/30">
        <h3 className="font-bold text-blue-300 mb-4 flex items-center gap-2">
          <span className="text-lg">💡</span> How to Use
        </h3>
        <div className="grid md:grid-cols-2 gap-6 text-sm text-blue-200/80">
          <div className="space-y-2">
            <p className="font-semibold text-blue-300">For Each Room Type:</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li>Set separate pricing for Non-AC rooms</li>
              <li>Set separate pricing for AC rooms</li>
              <li>Choose from 5 duration tiers</li>
              <li>Save when done</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-blue-300">Pricing Tiers:</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li><strong>1-DAY:</strong> Single night stays</li>
              <li><strong>7-DAY:</strong> Weekly bookings</li>
              <li><strong>10-DAY:</strong> Extended stays</li>
              <li><strong>15-DAY:</strong> Long-term rates</li>
              <li><strong>30-DAY:</strong> Monthly subscriptions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
