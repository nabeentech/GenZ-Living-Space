"use client";

import React, { useState } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { Tag, Plus, CheckCircle2, Calendar, Percent } from "lucide-react";

interface CouponsClientProps {
  initialCoupons: any[];
}

export const CouponsClient: React.FC<CouponsClientProps> = ({
  initialCoupons,
}) => {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState(15);
  const [minBookingAmount, setMinBookingAmount] = useState(1000);
  const [maxDiscountAmount, setMaxDiscountAmount] = useState(500);
  const [expiryDate, setExpiryDate] = useState("2028-12-31");
  const [usageLimit, setUsageLimit] = useState(500);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          description,
          discountType,
          discountValue,
          minBookingAmount,
          maxDiscountAmount,
          expiryDate,
          usageLimit,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to create coupon");
      }

      setCoupons([json.data, ...coupons]);
      setShowCreateModal(false);
      setCode("");
      setDescription("");
    } catch (err: any) {
      alert(err.message || "Coupon creation error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          variant="glow"
          size="sm"
          onClick={() => setShowCreateModal(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Create New Coupon
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {coupons.map((c) => (
          <div
            key={c.id}
            className="glass-panel p-6 rounded-3xl border border-slate-800 bg-[#101626]/80 flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-base font-black text-pink-400">
                  {c.code}
                </span>
                <Badge variant={c.active ? "available" : "default"} size="sm">
                  {c.active ? "ACTIVE" : "INACTIVE"}
                </Badge>
              </div>

              <span className="text-xl font-black text-white block">
                {c.discountType === "PERCENTAGE"
                  ? `${c.discountValue}% OFF`
                  : `₹${c.discountValue} FLAT OFF`}
              </span>
              <p className="text-xs text-slate-400 mt-1">{c.description}</p>
            </div>

            <div className="space-y-1.5 pt-3 border-t border-slate-800 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Min Spend:</span>
                <span className="font-bold text-white">
                  ₹{c.minBookingAmount.toLocaleString()}
                </span>
              </div>
              {c.maxDiscountAmount && (
                <div className="flex justify-between">
                  <span>Max Cap:</span>
                  <span className="font-bold text-white">
                    ₹{c.maxDiscountAmount.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Usage Limit:</span>
                <span className="font-bold text-white">
                  {c.usedCount} / {c.usageLimit}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Expires:</span>
                <span className="text-slate-400">
                  {new Date(c.expiryDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create Discount Coupon"
          description="Configure marketing code and rules"
        >
          <form onSubmit={handleCreateCoupon} className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                Coupon Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. SUMMER25"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono font-bold text-white uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                Description
              </label>
              <input
                type="text"
                placeholder="e.g. Summer special for nomads"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                  Discount Type
                </label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                >
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED">Fixed Amount (₹)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                  Value ({discountType === "PERCENTAGE" ? "%" : "₹"})
                </label>
                <input
                  type="number"
                  required
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                  Min Spend (₹)
                </label>
                <input
                  type="number"
                  value={minBookingAmount}
                  onChange={(e) => setMinBookingAmount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                  Max Discount Cap (₹)
                </label>
                <input
                  type="number"
                  value={maxDiscountAmount}
                  onChange={(e) => setMaxDiscountAmount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="glow"
                size="sm"
                type="submit"
                isLoading={isSubmitting}
              >
                Create Coupon
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default CouponsClient;
