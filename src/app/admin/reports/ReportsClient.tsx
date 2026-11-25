"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import CustomSelect from "@/components/ui/CustomSelect";
import DatePicker from "@/components/ui/DatePicker";
import PaginationBar from "@/components/ui/PaginationBar";
import { isWalkInBooking } from "@/lib/booking-source";
import {
  Download,
  IndianRupee,
  Wallet,
  Clock,
  Shield,
  TrendingUp,
  RotateCcw,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Banknote,
  Smartphone,
  CreditCard,
  Building2,
} from "lucide-react";

interface ReportsClientProps {
  hostels: any[];
  payments: any[];
  invoices: any[];
  activeBookings: any[];
  refunds: any[];
}

type DatePreset = "today" | "yesterday" | "last7" | "thisMonth" | "lastMonth" | "all" | "custom";

const getIndiaDateKey = (date: Date | string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));

const shiftIndiaDateKey = (days: number) => {
  const now = new Date();
  now.setDate(now.getDate() + days);
  return getIndiaDateKey(now);
};

const normalizeMethod = (payment: any): "CASH" | "UPI" | "CARD" | "BANK" | "ONLINE" => {
  const raw = (payment.paymentMethod || payment.gateway || "").toUpperCase();
  if (raw.includes("CASH")) return "CASH";
  if (raw.includes("UPI") || raw.includes("QR")) return "UPI";
  if (raw.includes("CARD")) return "CARD";
  if (raw.includes("BANK") || raw.includes("NEFT") || raw.includes("IMPS")) return "BANK";
  if (raw.includes("PHONEPE") || raw.includes("RAZORPAY") || raw.includes("ONLINE")) return "ONLINE";
  return "CASH";
};

export const ReportsClient: React.FC<ReportsClientProps> = ({
  hostels,
  payments,
  invoices,
  activeBookings,
  refunds,
}) => {
  const todayKey = useMemo(() => getIndiaDateKey(new Date()), []);

  const [datePreset, setDatePreset] = useState<DatePreset>("thisMonth");
  const [customFrom, setCustomFrom] = useState(() => `${todayKey.slice(0, 7)}-01`);
  const [customTo, setCustomTo] = useState(todayKey);
  const [selectedHostelId, setSelectedHostelId] = useState("all");
  const [stayFilter, setStayFilter] = useState<"all" | "MONTHLY" | "DAILY">("all");
  const [modeFilter, setModeFilter] = useState<"all" | "CASH" | "UPI" | "CARD" | "BANK" | "ONLINE">("all");
  const [pendingPage, setPendingPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const reportPageSize = 15;

  // Resolve active date range (YYYY-MM-DD in Asia/Kolkata)
  const dateRange = useMemo(() => {
    if (datePreset === "all") return { from: null as string | null, to: null as string | null };
    if (datePreset === "today") return { from: todayKey, to: todayKey };
    if (datePreset === "yesterday") {
      const y = shiftIndiaDateKey(-1);
      return { from: y, to: y };
    }
    if (datePreset === "last7") {
      return { from: shiftIndiaDateKey(-6), to: todayKey };
    }
    if (datePreset === "thisMonth") {
      return { from: `${todayKey.slice(0, 7)}-01`, to: todayKey };
    }
    if (datePreset === "lastMonth") {
      const d = new Date(`${todayKey.slice(0, 7)}-01T12:00:00Z`);
      d.setUTCMonth(d.getUTCMonth() - 1);
      const ym = d.toISOString().slice(0, 7);
      const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))
        .toISOString()
        .slice(0, 10);
      return { from: `${ym}-01`, to: lastDay };
    }
    return { from: customFrom || null, to: customTo || null };
  }, [datePreset, customFrom, customTo, todayKey]);

  const inDateRange = (value: Date | string) => {
    if (!dateRange.from && !dateRange.to) return true;
    const key = getIndiaDateKey(value);
    if (dateRange.from && key < dateRange.from) return false;
    if (dateRange.to && key > dateRange.to) return false;
    return true;
  };

  // Filter payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (!inDateRange(p.createdAt)) return false;
      if (selectedHostelId !== "all" && p.booking?.hostelId !== selectedHostelId) return false;
      if (stayFilter !== "all" && p.booking?.stayType !== stayFilter) return false;
      if (modeFilter !== "all" && normalizeMethod(p) !== modeFilter) return false;
      return true;
    });
  }, [payments, dateRange, selectedHostelId, stayFilter, modeFilter]);

  // Filter invoices in selected date range (for "Total Bill Amount")
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (!inDateRange(inv.issueDate)) return false;
      if (selectedHostelId !== "all" && inv.hostelId !== selectedHostelId) return false;
      if (stayFilter !== "all" && inv.booking?.stayType !== stayFilter) return false;
      return true;
    });
  }, [invoices, dateRange, selectedHostelId, stayFilter]);

  // All open unpaid invoices right now (matching Property & Stay Type — so owner never misses overdue dues)
  const pendingInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (Math.round((inv.totalAmount - inv.paidAmount) * 100) <= 0) return false;
      if (selectedHostelId !== "all" && inv.hostelId !== selectedHostelId) return false;
      if (stayFilter !== "all" && inv.booking?.stayType !== stayFilter) return false;
      // Ignore future placeholder monthly cycle invoices whose due date == checkOutDate far in future (>7 days) unless overdue/due soon?
      // Actually include all issued open invoices so billed == received + pending!
      return true;
    });
  }, [invoices, selectedHostelId, stayFilter]);

  // Refunds in range
  const filteredProcessedRefunds = useMemo(() => {
    return refunds.filter((r) => {
      if (r.status !== "PROCESSED") return false;
      if (!inDateRange(r.processedAt || r.requestedAt)) return false;
      if (selectedHostelId !== "all" && r.booking?.hostelId !== selectedHostelId) return false;
      if (stayFilter !== "all" && r.booking?.stayType !== stayFilter) return false;
      return true;
    });
  }, [refunds, dateRange, selectedHostelId, stayFilter]);

  const pendingRefundCount = useMemo(
    () =>
      refunds.filter((r) => {
        if (r.status !== "REQUESTED") return false;
        if (selectedHostelId !== "all" && r.booking?.hostelId !== selectedHostelId) return false;
        return true;
      }).length,
    [refunds, selectedHostelId]
  );

  // Core plain-English numbers
  const totalBilled = useMemo(
    () => filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
    [filteredInvoices]
  );

  const moneyReceived = useMemo(
    () => filteredPayments.reduce((sum, p) => sum + p.amount, 0),
    [filteredPayments]
  );

  const totalPendingAllTime = useMemo(
    () => pendingInvoices.reduce((sum, inv) => sum + Math.max(0, inv.totalAmount - inv.paidAmount), 0),
    [pendingInvoices]
  );

  const overduePending = useMemo(
    () =>
      pendingInvoices
        .filter((inv) => getIndiaDateKey(inv.dueDate) < todayKey)
        .reduce((sum, inv) => sum + Math.max(0, inv.totalAmount - inv.paidAmount), 0),
    [pendingInvoices, todayKey]
  );

  const upcomingPending = Math.max(0, totalPendingAllTime - overduePending);

  // Security deposits currently kept safe for active residents
  const depositsHeldActive = useMemo(() => {
    return activeBookings
      .filter((b) => {
        if (selectedHostelId !== "all" && b.hostelId !== selectedHostelId) return false;
        if (stayFilter !== "all" && b.stayType !== stayFilter) return false;
        return true;
      })
      .reduce((sum, b) => sum + (b.paidSecurityDeposit || 0), 0);
  }, [activeBookings, selectedHostelId, stayFilter]);

  // Estimate deposit portion inside filteredPayments so "Your Actual Rent Income" is accurate
  const depositsCollectedInRange = useMemo(() => {
    let depSum = 0;
    const seenInitialBooking = new Set<string>();
    // Sort oldest first to attribute initial deposit accurately if metadata missing
    const sorted = [...filteredPayments].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    for (const p of sorted) {
      if (p.metadata) {
        try {
          const meta = JSON.parse(p.metadata);
          if (typeof meta?.depositAllocated === "number") {
            depSum += meta.depositAllocated;
            continue;
          }
        } catch {
          // ignore
        }
      }
      if (p.bookingId && !seenInitialBooking.has(p.bookingId)) {
        seenInitialBooking.add(p.bookingId);
        const dep = Math.min(p.amount, p.booking?.paidSecurityDeposit || 0);
        depSum += dep;
      }
    }
    return depSum;
  }, [filteredPayments]);

  const refundsGiven = useMemo(
    () => filteredProcessedRefunds.reduce((sum, r) => sum + r.amount, 0),
    [filteredProcessedRefunds]
  );

  const actualEarnedIncome = Math.max(0, moneyReceived - depositsCollectedInRange - refundsGiven);

  // Payment method breakdown
  const methodBreakdown = useMemo(() => {
    const totals: Record<"CASH" | "UPI" | "CARD" | "BANK" | "ONLINE", number> = {
      CASH: 0,
      UPI: 0,
      CARD: 0,
      BANK: 0,
      ONLINE: 0,
    };
    for (const p of filteredPayments) {
      totals[normalizeMethod(p)] += p.amount;
    }
    return [
      { key: "CASH", label: "Cash in Hand", amount: totals.CASH, icon: Banknote, color: "text-emerald-300", bar: "bg-emerald-500" },
      { key: "UPI", label: "UPI / PhonePe / QR", amount: totals.UPI, icon: Smartphone, color: "text-indigo-300", bar: "bg-indigo-500" },
      { key: "BANK", label: "Bank Transfer", amount: totals.BANK, icon: Building2, color: "text-cyan-300", bar: "bg-cyan-500" },
      { key: "CARD", label: "Card Swipe", amount: totals.CARD, icon: CreditCard, color: "text-amber-300", bar: "bg-amber-500" },
      { key: "ONLINE", label: "Online Website", amount: totals.ONLINE, icon: Wallet, color: "text-pink-300", bar: "bg-pink-500" },
    ];
  }, [filteredPayments]);

  // Property summary table
  const propertySummaries = useMemo(() => {
    return hostels
      .filter((h) => selectedHostelId === "all" || h.id === selectedHostelId)
      .map((h) => {
        let totalBeds = 0;
        let occupiedBeds = 0;
        h.rooms.forEach((r: any) => {
          r.beds.forEach((b: any) => {
            totalBeds++;
            if (b.status === "OCCUPIED") occupiedBeds++;
          });
        });

        const billed = filteredInvoices
          .filter((inv) => inv.hostelId === h.id)
          .reduce((s, inv) => s + inv.totalAmount, 0);

        const received = filteredPayments
          .filter((p) => p.booking?.hostelId === h.id)
          .reduce((s, p) => s + p.amount, 0);

        const pending = pendingInvoices
          .filter((inv) => inv.hostelId === h.id)
          .reduce((s, inv) => s + Math.max(0, inv.totalAmount - inv.paidAmount), 0);

        const deposits = activeBookings
          .filter((b) => b.hostelId === h.id && (stayFilter === "all" || b.stayType === stayFilter))
          .reduce((s, b) => s + (b.paidSecurityDeposit || 0), 0);

        return {
          id: h.id,
          name: h.name,
          city: h.city,
          totalBeds,
          occupiedBeds,
          occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
          billed,
          received,
          pending,
          deposits,
        };
      });
  }, [hostels, selectedHostelId, filteredInvoices, filteredPayments, pendingInvoices, activeBookings, stayFilter]);

  const collectionPercent = totalBilled > 0 ? Math.min(100, Math.round((moneyReceived / totalBilled) * 100)) : 0;

  // CSV Exports
  const exportSummaryCSV = () => {
    const headers = [
      "Property",
      "City",
      "Occupied Beds",
      "Total Beds",
      "Total Billed (INR)",
      "Money Received (INR)",
      "Yet to Come / Pending (INR)",
      "Deposits Kept Safe (INR)",
    ];
    const rows = propertySummaries.map((h) => [
      `"${h.name}"`,
      `"${h.city}"`,
      h.occupiedBeds,
      h.totalBeds,
      h.billed,
      h.received,
      h.pending,
      h.deposits,
    ]);
    const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `money_summary_${todayKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportTransactionsCSV = () => {
    const headers = ["Date", "Booking Ref", "Guest Name", "Phone", "Stay Type", "Mode", "Amount Received (INR)"];
    const rows = filteredPayments.map((p) => [
      `"${new Date(p.createdAt).toLocaleString("en-IN")}"`,
      `"${p.booking?.bookingReference || ""}"`,
      `"${p.booking?.guestName || ""}"`,
      `"${p.booking?.guestPhone || ""}"`,
      `"${p.booking?.stayType || ""}"`,
      `"${normalizeMethod(p)}"`,
      p.amount,
    ]);
    const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `payments_received_${todayKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. Simple Filter Bar */}
      <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-slate-800 bg-[#111827]/85 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "last7", label: "Last 7 Days" },
              { id: "thisMonth", label: "This Month" },
              { id: "lastMonth", label: "Last Month" },
              { id: "all", label: "All Time" },
              { id: "custom", label: "Pick Dates" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setDatePreset(p.id as DatePreset)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  datePreset === p.id
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                    : "bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={exportTransactionsCSV} leftIcon={<Download className="w-3.5 h-3.5" />}>
              Download Payments CSV
            </Button>
            <Button variant="glow" size="sm" onClick={exportSummaryCSV} leftIcon={<Download className="w-3.5 h-3.5" />}>
              Download Summary CSV
            </Button>
          </div>
        </div>

        {datePreset === "custom" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 max-w-md">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">From Date</label>
              <DatePicker value={customFrom} onChange={setCustomFrom} triggerClassName="p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">To Date</label>
              <DatePicker value={customTo} onChange={setCustomTo} triggerClassName="p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-800/80">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Property</label>
            <CustomSelect
              value={selectedHostelId}
              onValueChange={setSelectedHostelId}
              options={[
                { value: "all", label: "All Properties" },
                ...hostels.map((h) => ({ value: h.id, label: h.name })),
              ]}
              triggerClassName="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Stay Type</label>
            <CustomSelect
              value={stayFilter}
              onValueChange={(v) => setStayFilter(v as any)}
              options={[
                { value: "all", label: "All Stays (Monthly + Daily)" },
                { value: "MONTHLY", label: "Monthly Residents Only" },
                { value: "DAILY", label: "Daily Guests Only" },
              ]}
              triggerClassName="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Payment Mode</label>
            <CustomSelect
              value={modeFilter}
              onValueChange={(v) => setModeFilter(v as any)}
              options={[
                { value: "all", label: "All Modes (Cash + UPI + Bank)" },
                { value: "CASH", label: "Cash Only" },
                { value: "UPI", label: "UPI / PhonePe / QR Only" },
                { value: "BANK", label: "Bank Transfer Only" },
                { value: "CARD", label: "Card Only" },
                { value: "ONLINE", label: "Online Website Only" },
              ]}
              triggerClassName="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs"
            />
          </div>
        </div>
      </div>

      {/* 2. Plain-English Money Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Total Bill Amount */}
        <div className="rounded-3xl border border-slate-800 bg-[#111827]/90 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">1. Total Bill Amount</span>
            <IndianRupee className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-3xl font-black text-white">₹{totalBilled.toLocaleString("en-IN")}</div>
          <p className="text-xs text-slate-400">
            Total bills made in this period ({filteredInvoices.length} bills)
          </p>
        </div>

        {/* Card 2: Money Received */}
        <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">2. Money Received</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-300">₹{moneyReceived.toLocaleString("en-IN")}</div>
          <p className="text-xs text-emerald-200/80">
            Actual cash &amp; online money you got ({filteredPayments.length} payments)
          </p>
        </div>

        {/* Card 3: Money Yet to Come */}
        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">3. Money Yet to Come</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-300">₹{totalPendingAllTime.toLocaleString("en-IN")}</div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-rose-300 font-semibold">Late: ₹{overduePending.toLocaleString("en-IN")}</span>
            <span className="text-slate-400">·</span>
            <span className="text-amber-200">Due later: ₹{upcomingPending.toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* Card 4: Your Actual Rent Income */}
        <div className="rounded-3xl border border-indigo-500/30 bg-indigo-500/10 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">4. Your Actual Income</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-indigo-200">₹{actualEarnedIncome.toLocaleString("en-IN")}</div>
          <p className="text-xs text-slate-300">
            Money received minus guest deposits (₹{depositsCollectedInRange.toLocaleString("en-IN")}) &amp; refunds
          </p>
        </div>

        {/* Card 5: Guest Deposits Kept Safe */}
        <div className="rounded-3xl border border-cyan-500/30 bg-cyan-500/10 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">5. Deposits Kept Safe</span>
            <Shield className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-cyan-200">₹{depositsHeldActive.toLocaleString("en-IN")}</div>
          <p className="text-xs text-slate-300">
            Refundable security deposits held for current residents (to return at checkout)
          </p>
        </div>

        {/* Card 6: Refunds Given Back */}
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-300">6. Refunds Given Back</span>
            <RotateCcw className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-black text-rose-300">₹{refundsGiven.toLocaleString("en-IN")}</div>
          <p className="text-xs text-slate-400">
            {pendingRefundCount > 0 ? `${pendingRefundCount} refund request(s) waiting` : "No pending refund requests"}
          </p>
        </div>
      </div>

      {/* 3. Collection Progress + How Money Came In */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Collection Progress */}
        <div className="rounded-3xl border border-slate-800 bg-[#111827]/85 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Collection Progress</h3>
              <p className="text-xs text-slate-400">How much of the billed amount was collected in this period</p>
            </div>
            <span className="text-2xl font-black text-emerald-300">{collectionPercent}%</span>
          </div>
          <div className="h-3.5 w-full overflow-hidden rounded-full bg-slate-900 border border-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${collectionPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
            <span>Received: <strong className="text-emerald-300">₹{moneyReceived.toLocaleString("en-IN")}</strong></span>
            <span>Billed: <strong className="text-white">₹{totalBilled.toLocaleString("en-IN")}</strong></span>
          </div>
          {(() => {
            const walkInRev = filteredPayments
              .filter((p) => isWalkInBooking(p.booking?.bookingReference))
              .reduce((s, p) => s + p.amount, 0);
            const onlineRev = Math.max(0, moneyReceived - walkInRev);
            return (
              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-800 text-xs">
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5">
                  <div className="text-[10px] font-bold uppercase text-amber-300">Walk-In Received</div>
                  <div className="text-sm font-black text-white mt-0.5">₹{walkInRev.toLocaleString("en-IN")}</div>
                </div>
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-2.5">
                  <div className="text-[10px] font-bold uppercase text-cyan-300">Online Received</div>
                  <div className="text-sm font-black text-white mt-0.5">₹{onlineRev.toLocaleString("en-IN")}</div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* How Money Came In */}
        <div className="rounded-3xl border border-slate-800 bg-[#111827]/85 p-5 sm:p-6 space-y-3.5">
          <div>
            <h3 className="text-base font-bold text-white">How Money Came In (Cash vs Bank)</h3>
            <p className="text-xs text-slate-400">Check this against your cash drawer and UPI/bank account</p>
          </div>
          <div className="space-y-2.5">
            {methodBreakdown.map((m) => {
              const Icon = m.icon;
              const pct = moneyReceived > 0 ? Math.round((m.amount / moneyReceived) * 100) : 0;
              return (
                <div key={m.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-semibold text-slate-200">
                      <Icon className={`w-3.5 h-3.5 ${m.color}`} />
                      {m.label}
                    </span>
                    <span className={`font-bold ${m.color}`}>
                      ₹{m.amount.toLocaleString("en-IN")} <span className="text-[10px] text-slate-500">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-900">
                    <div className={`h-full rounded-full ${m.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Property Breakdown */}
      <div className="rounded-3xl border border-slate-800 bg-[#111827]/85 p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">Property-Wise Summary</h3>
          <p className="text-xs text-slate-400">Clear breakdown for each hostel property</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-900/80 font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-3">Property</th>
                <th className="p-3">Beds Filled</th>
                <th className="p-3">Total Billed</th>
                <th className="p-3">Money Received</th>
                <th className="p-3">Yet to Come</th>
                <th className="p-3">Deposits Kept Safe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {propertySummaries.map((h) => (
                <tr key={h.id} className="hover:bg-slate-900/50">
                  <td className="p-3 font-bold text-white">
                    {h.name}
                    <span className="block text-[10px] font-normal text-slate-400">{h.city}</span>
                  </td>
                  <td className="p-3">
                    {h.occupiedBeds} / {h.totalBeds} ({h.occupancyRate}%)
                  </td>
                  <td className="p-3 font-semibold text-white">₹{h.billed.toLocaleString("en-IN")}</td>
                  <td className="p-3 font-bold text-emerald-300">₹{h.received.toLocaleString("en-IN")}</td>
                  <td className="p-3 font-bold text-amber-300">₹{h.pending.toLocaleString("en-IN")}</td>
                  <td className="p-3 font-semibold text-cyan-300">₹{h.deposits.toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Who Still Owes Money? */}
      <div className="rounded-3xl border border-amber-500/20 bg-[#111827]/85 p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Who Still Owes Money? ({pendingInvoices.length})
            </h3>
            <p className="text-xs text-slate-400">Customers with pending or late balance — click Collect to record payment</p>
          </div>
          <Link href="/admin/payments">
            <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Go to Payments Desk
            </Button>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-900/80 font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-3">Customer</th>
                <th className="p-3">Room / Ref</th>
                <th className="p-3">Due Date</th>
                <th className="p-3">Total Bill</th>
                <th className="p-3">Paid</th>
                <th className="p-3">Left to Pay</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {pendingInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-emerald-300 font-semibold">
                    <CheckCircle2 className="w-5 h-5 inline mr-1.5" />
                    Everyone is up to date — no pending money!
                  </td>
                </tr>
              ) : (
                pendingInvoices.slice((pendingPage - 1) * reportPageSize, pendingPage * reportPageSize).map((inv) => {
                  const left = Math.max(0, inv.totalAmount - inv.paidAmount);
                  const isLate = getIndiaDateKey(inv.dueDate) < todayKey;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-900/50">
                      <td className="p-3">
                        <span className="font-bold text-white block">{inv.booking?.guestName || "Guest"}</span>
                        <span className="text-[10px] text-slate-400">{inv.booking?.guestPhone}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-white">Rm {inv.booking?.room?.roomNumber || "—"}</span>
                        <span className="block text-[10px] font-mono text-indigo-300">{inv.booking?.bookingReference}</span>
                      </td>
                      <td className="p-3">
                        <span className={isLate ? "text-rose-300 font-semibold" : "text-slate-300"}>
                          {new Date(inv.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                        {isLate && (
                          <Badge variant="occupied" size="sm" className="ml-2">
                            Late
                          </Badge>
                        )}
                      </td>
                      <td className="p-3">₹{inv.totalAmount.toLocaleString("en-IN")}</td>
                      <td className="p-3 text-emerald-300">₹{inv.paidAmount.toLocaleString("en-IN")}</td>
                      <td className="p-3 font-black text-amber-300">₹{left.toLocaleString("en-IN")}</td>
                      <td className="p-3 text-right">
                        <Link href={`/admin/payments?search=${encodeURIComponent(inv.booking?.bookingReference || "")}`}>
                          <Button size="sm" variant="glow">Collect</Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <PaginationBar
          currentPage={pendingPage}
          totalItems={pendingInvoices.length}
          pageSize={reportPageSize}
          onPageChange={setPendingPage}
          itemLabel="pending bills"
        />
      </div>

      {/* 6. Recent Money Received */}
      <div className="rounded-3xl border border-slate-800 bg-[#111827]/85 p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">Money Received Log ({filteredPayments.length})</h3>
          <p className="text-xs text-slate-400">Latest payments received in the selected date range</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-900/80 font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-3">Date &amp; Time</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Room / Ref</th>
                <th className="p-3">Mode</th>
                <th className="p-3 text-right">Amount Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No payments received in this date range.
                  </td>
                </tr>
              ) : (
                filteredPayments.slice((paymentsPage - 1) * reportPageSize, paymentsPage * reportPageSize).map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/50">
                    <td className="p-3 text-slate-300">
                      {new Date(p.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-3 font-semibold text-white">{p.booking?.guestName || "Guest"}</td>
                    <td className="p-3">
                      <span className="text-slate-300">Rm {p.booking?.room?.roomNumber || "—"}</span>
                      <span className="ml-1.5 font-mono text-[10px] text-indigo-300">{p.booking?.bookingReference}</span>
                    </td>
                    <td className="p-3">
                      <Badge variant="default" size="sm">{normalizeMethod(p)}</Badge>
                    </td>
                    <td className="p-3 text-right font-black text-emerald-300">
                      +₹{p.amount.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationBar
          currentPage={paymentsPage}
          totalItems={filteredPayments.length}
          pageSize={reportPageSize}
          onPageChange={setPaymentsPage}
          itemLabel="payments"
        />
      </div>
    </div>
  );
};

export default ReportsClient;
