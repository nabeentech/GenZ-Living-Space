"use client";

import React, { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import CustomSelect from "@/components/ui/CustomSelect";
import DatePicker from "@/components/ui/DatePicker";
import Modal from "@/components/ui/Modal";
import PaginationBar from "@/components/ui/PaginationBar";
import { compressImageToDataUrl } from "@/lib/image-compress";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_MODES,
  getExpenseCategoryMeta,
  getExpensePaymentModeLabel,
} from "@/lib/expense-categories";
import {
  Plus,
  Download,
  Search,
  Wallet,
  Clock,
  TrendingDown,
  Receipt,
  Repeat,
  CheckCircle2,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Phone,
  Building2,
  X,
  Upload,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

export interface SerializedExpense {
  id: string;
  hostelId: string | null;
  hostelName: string | null;
  title: string;
  category: string;
  amount: number;
  expenseDate: string;
  paymentMode: string;
  status: string;
  vendorName: string | null;
  vendorPhone: string | null;
  receiptImage: string | null;
  isRecurring: boolean;
  notes: string | null;
  recordedByName: string | null;
  createdAt: string;
}

interface ExpensesClientProps {
  hostels: { id: string; name: string }[];
  initialExpenses: SerializedExpense[];
  canEdit: boolean;
  canDelete: boolean;
  hideFinancials: boolean;
}

type DatePreset =
  | "today"
  | "yesterday"
  | "last7"
  | "thisMonth"
  | "lastMonth"
  | "all"
  | "custom";

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

const formatDisplayDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const mapExpenseFromApi = (e: any): SerializedExpense => ({
  id: e.id,
  hostelId: e.hostelId || null,
  hostelName: e.hostel?.name || e.hostelName || null,
  title: e.title,
  category: e.category,
  amount: Number(e.amount),
  expenseDate:
    typeof e.expenseDate === "string"
      ? e.expenseDate
      : new Date(e.expenseDate).toISOString(),
  paymentMode: e.paymentMode,
  status: e.status,
  vendorName: e.vendorName || null,
  vendorPhone: e.vendorPhone || null,
  receiptImage: e.receiptImage || null,
  isRecurring: Boolean(e.isRecurring),
  notes: e.notes || null,
  recordedByName: e.recordedByName || null,
  createdAt:
    typeof e.createdAt === "string"
      ? e.createdAt
      : new Date(e.createdAt).toISOString(),
});

export const ExpensesClient: React.FC<ExpensesClientProps> = ({
  hostels,
  initialExpenses,
  canEdit,
  canDelete,
  hideFinancials,
}) => {
  const todayKey = useMemo(() => getIndiaDateKey(new Date()), []);
  const currentMonthKey = todayKey.slice(0, 7);

  const [expenses, setExpenses] = useState<SerializedExpense[]>(initialExpenses);
  const [datePreset, setDatePreset] = useState<DatePreset>("thisMonth");
  const [customFrom, setCustomFrom] = useState(() => `${todayKey.slice(0, 7)}-01`);
  const [customTo, setCustomTo] = useState(todayKey);
  const [hostelFilter, setHostelFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Feedback banner
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("POWER_BILLS");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(todayKey);
  const [formHostelId, setFormHostelId] = useState("common");
  const [formStatus, setFormStatus] = useState<"PAID" | "PENDING">("PAID");
  const [formPaymentMode, setFormPaymentMode] = useState("CASH");
  const [formVendorName, setFormVendorName] = useState("");
  const [formVendorPhone, setFormVendorPhone] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formIsRecurring, setFormIsRecurring] = useState(false);
  const [formReceiptImage, setFormReceiptImage] = useState<string | null>(null);
  const [compressingImage, setCompressingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Lightbox & delete confirm modals
  const [previewReceipt, setPreviewReceipt] = useState<{
    title: string;
    image: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SerializedExpense | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

  const maskAmt = (val: number) =>
    hideFinancials ? "••••••" : `₹${Math.round(val).toLocaleString("en-IN")}`;

  // Date range calculation
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

  const inDateRange = (value: string) => {
    if (!dateRange.from && !dateRange.to) return true;
    const key = getIndiaDateKey(value);
    if (dateRange.from && key < dateRange.from) return false;
    if (dateRange.to && key > dateRange.to) return false;
    return true;
  };

  // Filtered expenses for KPIs & table
  const filteredExpenses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return expenses.filter((e) => {
      if (!inDateRange(e.expenseDate)) return false;
      if (hostelFilter === "common" && e.hostelId !== null) return false;
      if (hostelFilter !== "all" && hostelFilter !== "common" && e.hostelId !== hostelFilter) {
        return false;
      }
      if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
      if (modeFilter !== "all" && e.paymentMode !== modeFilter) return false;
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (q) {
        const hay = `${e.title} ${e.vendorName || ""} ${e.vendorPhone || ""} ${e.notes || ""} ${
          e.hostelName || "common"
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    expenses,
    dateRange,
    hostelFilter,
    categoryFilter,
    modeFilter,
    statusFilter,
    searchQuery,
  ]);

  // Reset pagination whenever filters change
  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedExpenses = useMemo(
    () => filteredExpenses.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredExpenses, safePage]
  );

  // Summary Metrics
  const paidExpenses = useMemo(
    () => filteredExpenses.filter((e) => e.status === "PAID"),
    [filteredExpenses]
  );
  const totalPaidSpent = useMemo(
    () => paidExpenses.reduce((sum, e) => sum + e.amount, 0),
    [paidExpenses]
  );

  // Unpaid bills: show filtered period AND total open unpaid bills matching property
  const pendingInFilter = useMemo(
    () => filteredExpenses.filter((e) => e.status === "PENDING"),
    [filteredExpenses]
  );
  const pendingInFilterTotal = useMemo(
    () => pendingInFilter.reduce((sum, e) => sum + e.amount, 0),
    [pendingInFilter]
  );

  const totalOpenPendingAllTime = useMemo(() => {
    return expenses
      .filter((e) => {
        if (e.status !== "PENDING") return false;
        if (hostelFilter === "common" && e.hostelId !== null) return false;
        if (hostelFilter !== "all" && hostelFilter !== "common" && e.hostelId !== hostelFilter) {
          return false;
        }
        return true;
      })
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, hostelFilter]);

  const cashSpent = useMemo(
    () => paidExpenses.filter((e) => e.paymentMode === "CASH").reduce((s, e) => s + e.amount, 0),
    [paidExpenses]
  );
  const digitalSpent = Math.max(0, totalPaidSpent - cashSpent);

  // Category Breakdown (for paid + pending filtered view, weighted toward PAID)
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { paid: number; pending: number; count: number }>();
    for (const e of filteredExpenses) {
      const curr = map.get(e.category) || { paid: 0, pending: 0, count: 0 };
      if (e.status === "PAID") curr.paid += e.amount;
      else curr.pending += e.amount;
      curr.count += 1;
      map.set(e.category, curr);
    }
    return Array.from(map.entries())
      .map(([code, vals]) => ({
        meta: getExpenseCategoryMeta(code),
        total: vals.paid + vals.pending,
        paid: vals.paid,
        pending: vals.pending,
        count: vals.count,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredExpenses]);

  const topCategory = categoryBreakdown[0] || null;
  const maxCategoryTotal = topCategory ? topCategory.total : 1;

  // Monthly Recurring Templates (deduplicated by title + category + hostelId)
  const recurringTemplates = useMemo(() => {
    const seen = new Map<string, SerializedExpense>();
    const thisMonthSignatures = new Set<string>();

    for (const e of expenses) {
      const sig = `${e.category}::${e.title.trim().toLowerCase()}::${e.hostelId || "common"}`;
      if (getIndiaDateKey(e.expenseDate).slice(0, 7) === currentMonthKey) {
        thisMonthSignatures.add(sig);
      }
      if (e.isRecurring && !seen.has(sig)) {
        seen.set(sig, e);
      }
    }

    return Array.from(seen.entries()).map(([sig, template]) => ({
      template,
      recordedThisMonth: thisMonthSignatures.has(sig),
    }));
  }, [expenses, currentMonthKey]);

  const resetModal = () => {
    setEditingId(null);
    setFormTitle("");
    setFormCategory("POWER_BILLS");
    setFormAmount("");
    setFormDate(todayKey);
    setFormHostelId(hostelFilter !== "all" ? hostelFilter : "common");
    setFormStatus("PAID");
    setFormPaymentMode("CASH");
    setFormVendorName("");
    setFormVendorPhone("");
    setFormNotes("");
    setFormIsRecurring(false);
    setFormReceiptImage(null);
    setFormError(null);
  };

  const openAddModal = (presetCategory?: string) => {
    resetModal();
    if (presetCategory) {
      setFormCategory(presetCategory);
      if (["POWER_BILLS", "WATER_BILLS", "STAFF_SALARY", "INTERNET_WIFI", "PROPERTY_RENT"].includes(presetCategory)) {
        setFormIsRecurring(true);
      }
    }
    setIsModalOpen(true);
  };

  const openEditModal = (exp: SerializedExpense) => {
    setEditingId(exp.id);
    setFormTitle(exp.title);
    setFormCategory(exp.category);
    setFormAmount(String(exp.amount));
    setFormDate(getIndiaDateKey(exp.expenseDate));
    setFormHostelId(exp.hostelId || "common");
    setFormStatus(exp.status === "PENDING" ? "PENDING" : "PAID");
    setFormPaymentMode(exp.paymentMode || "CASH");
    setFormVendorName(exp.vendorName || "");
    setFormVendorPhone(exp.vendorPhone || "");
    setFormNotes(exp.notes || "");
    setFormIsRecurring(exp.isRecurring);
    setFormReceiptImage(exp.receiptImage);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openRepeatTemplateModal = (template: SerializedExpense) => {
    setEditingId(null);
    setFormTitle(template.title);
    setFormCategory(template.category);
    setFormAmount(String(template.amount));
    setFormDate(todayKey);
    setFormHostelId(template.hostelId || "common");
    setFormStatus("PAID");
    setFormPaymentMode(template.paymentMode || "UPI");
    setFormVendorName(template.vendorName || "");
    setFormVendorPhone(template.vendorPhone || "");
    setFormNotes(template.notes || "");
    setFormIsRecurring(true);
    setFormReceiptImage(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError(null);
    setCompressingImage(true);
    try {
      const compressed = await compressImageToDataUrl(file, 900, 0.55);
      setFormReceiptImage(compressed);
    } catch {
      setFormError("Could not process image. Please choose a valid JPG/PNG photo.");
    } finally {
      setCompressingImage(false);
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedAmount = Number(formAmount);
    if (formTitle.trim().length < 2) {
      setFormError("Please enter a short description for this expense.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Please enter a valid amount greater than ₹0.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: formTitle.trim(),
        category: formCategory,
        amount: parsedAmount,
        expenseDate: formDate,
        hostelId: formHostelId === "common" ? null : formHostelId,
        status: formStatus,
        paymentMode: formPaymentMode,
        vendorName: formVendorName.trim() || null,
        vendorPhone: formVendorPhone.trim() || null,
        notes: formNotes.trim() || null,
        isRecurring: formIsRecurring,
        receiptImage: formReceiptImage,
      };

      const res = await fetch(
        editingId ? `/api/admin/expenses/${editingId}` : "/api/admin/expenses",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to save expense.");
        return;
      }

      const saved = mapExpenseFromApi(data.expense);
      if (editingId) {
        setExpenses((prev) => prev.map((item) => (item.id === editingId ? saved : item)));
        setBanner({ type: "success", text: `Updated "${saved.title}".` });
      } else {
        setExpenses((prev) => [saved, ...prev]);
        setBanner({ type: "success", text: `Saved "${saved.title}" (${maskAmt(saved.amount)}).` });
      }
      setIsModalOpen(false);
      resetModal();
    } catch {
      setFormError("Network error while saving expense.");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAsPaid = async (exp: SerializedExpense) => {
    setMarkingPaidId(exp.id);
    setBanner(null);
    try {
      const res = await fetch(`/api/admin/expenses/${exp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ type: "error", text: data.error || "Could not mark bill as paid." });
        return;
      }
      const updated = mapExpenseFromApi(data.expense);
      setExpenses((prev) => prev.map((item) => (item.id === exp.id ? updated : item)));
      setBanner({ type: "success", text: `Marked "${updated.title}" as Paid.` });
    } catch {
      setBanner({ type: "error", text: "Network error while updating bill status." });
    } finally {
      setMarkingPaidId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/admin/expenses/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ type: "error", text: data.error || "Could not delete expense." });
        return;
      }
      setExpenses((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setBanner({ type: "success", text: `Deleted "${deleteTarget.title}".` });
      setDeleteTarget(null);
    } catch {
      setBanner({ type: "error", text: "Network error while deleting expense." });
    } finally {
      setDeleting(false);
    }
  };

  const exportExpensesCSV = () => {
    const headers = [
      "Date",
      "Title",
      "Category",
      "Property",
      "Status",
      "Payment Mode",
      "Amount (INR)",
      "Vendor Name",
      "Vendor Phone",
      "Monthly Bill",
      "Notes",
      "Recorded By",
    ];
    const escapeCell = (val: string | number | null | undefined) =>
      `"${String(val ?? "").replace(/"/g, '""')}"`;

    const rows = filteredExpenses.map((e) => [
      escapeCell(formatDisplayDate(e.expenseDate)),
      escapeCell(e.title),
      escapeCell(getExpenseCategoryMeta(e.category).label),
      escapeCell(e.hostelName || "Common / All Properties"),
      escapeCell(e.status),
      escapeCell(getExpensePaymentModeLabel(e.paymentMode)),
      e.amount,
      escapeCell(e.vendorName),
      escapeCell(e.vendorPhone),
      escapeCell(e.isRecurring ? "Yes" : "No"),
      escapeCell(e.notes),
      escapeCell(e.recordedByName),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `expenses_${todayKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const coreQuickCategories = EXPENSE_CATEGORIES.filter((c) => c.priority);

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {banner && (
        <div
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border text-xs font-semibold ${
            banner.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          <span>{banner.text}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Quick Category Entry Strip + Filters */}
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
                onClick={() => {
                  setDatePreset(p.id as DatePreset);
                  setPage(1);
                }}
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

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportExpensesCSV}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Download CSV
            </Button>
            {canEdit && (
              <Button
                variant="glow"
                size="sm"
                onClick={() => openAddModal()}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Expense
              </Button>
            )}
          </div>
        </div>

        {datePreset === "custom" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 max-w-md">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                From Date
              </label>
              <DatePicker
                value={customFrom}
                onChange={(v) => {
                  setCustomFrom(v);
                  setPage(1);
                }}
                triggerClassName="p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                To Date
              </label>
              <DatePicker
                value={customTo}
                onChange={(v) => {
                  setCustomTo(v);
                  setPage(1);
                }}
                triggerClassName="p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs"
              />
            </div>
          </div>
        )}

        {/* Quick 1-tap Add Buttons for Core Expenses */}
        {canEdit && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/70">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
              Quick Add:
            </span>
            {coreQuickCategories.map((cat) => (
              <button
                key={cat.code}
                type="button"
                onClick={() => openAddModal(cat.code)}
                className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold transition hover:brightness-125 ${cat.badgeColor}`}
              >
                + {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-800/80">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Property
            </label>
            <CustomSelect
              value={hostelFilter}
              onValueChange={(v) => {
                setHostelFilter(v);
                setPage(1);
              }}
              options={[
                { value: "all", label: "All Properties" },
                { value: "common", label: "Common / Shared Only" },
                ...hostels.map((h) => ({ value: h.id, label: h.name })),
              ]}
              triggerClassName="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Category
            </label>
            <CustomSelect
              value={categoryFilter}
              onValueChange={(v) => {
                setCategoryFilter(v);
                setPage(1);
              }}
              options={[
                { value: "all", label: "All Categories" },
                ...EXPENSE_CATEGORIES.map((c) => ({ value: c.code, label: c.label })),
              ]}
              triggerClassName="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Payment Mode
            </label>
            <CustomSelect
              value={modeFilter}
              onValueChange={(v) => {
                setModeFilter(v);
                setPage(1);
              }}
              options={[
                { value: "all", label: "All Modes" },
                ...EXPENSE_PAYMENT_MODES.map((m) => ({ value: m.code, label: m.label })),
              ]}
              triggerClassName="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Bill Status
            </label>
            <CustomSelect
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
              options={[
                { value: "all", label: "Paid + Unpaid Bills" },
                { value: "PAID", label: "Paid Only" },
                { value: "PENDING", label: "Unpaid / Pending Only" },
              ]}
              triggerClassName="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Bill, electrician, vendor..."
                className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. 4 Plain-English KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-300">
              1. Money Paid Out
            </span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-black text-rose-200">{maskAmt(totalPaidSpent)}</div>
          <p className="text-xs text-rose-200/80">
            {paidExpenses.length} paid expense{paidExpenses.length === 1 ? "" : "s"} in this period
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === "PENDING" ? "all" : "PENDING");
            setPage(1);
          }}
          className="text-left rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-2 hover:border-amber-400/60 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              2. Unpaid / Pending Bills
            </span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-300">{maskAmt(totalOpenPendingAllTime)}</div>
          <p className="text-xs text-amber-200/80">
            {pendingInFilterTotal > 0 && pendingInFilterTotal !== totalOpenPendingAllTime
              ? `${maskAmt(pendingInFilterTotal)} in range · Click to filter`
              : `${pendingInFilter.length} bill(s) waiting to be paid`}
          </p>
        </button>

        <div className="rounded-3xl border border-indigo-500/30 bg-indigo-500/10 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
              3. Cash vs UPI / Bank Spent
            </span>
            <Wallet className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white flex flex-wrap items-baseline gap-2">
            <span>{maskAmt(cashSpent)}</span>
            <span className="text-xs font-bold text-slate-400">Cash</span>
          </div>
          <p className="text-xs text-indigo-200/80">
            UPI / Bank / Card paid: <strong>{maskAmt(digitalSpent)}</strong>
          </p>
        </div>

        <div className="rounded-3xl border border-cyan-500/30 bg-cyan-500/10 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              4. Biggest Expense Area
            </span>
            <Receipt className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-black text-cyan-200 truncate">
            {topCategory ? topCategory.meta.label : "No Expenses Yet"}
          </div>
          <p className="text-xs text-cyan-200/80">
            {topCategory
              ? `${maskAmt(topCategory.total)} across ${topCategory.count} bill(s)`
              : "Add an expense to see breakdown"}
          </p>
        </div>
      </div>

      {/* 3. Category Breakdown + Recurring Monthly Bills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Category Breakdown */}
        <div className="rounded-3xl border border-slate-800 bg-[#111827]/85 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-white">Where Money Went (By Category)</h3>
              <p className="text-xs text-slate-400">
                Tap any row to filter bills for that category
              </p>
            </div>
            {categoryFilter !== "all" && (
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter("all");
                  setPage(1);
                }}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
              >
                Show All
              </button>
            )}
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No expenses match the selected filters.
            </div>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.map((item) => {
                const widthPct = Math.max(
                  4,
                  Math.round((item.total / maxCategoryTotal) * 100)
                );
                const isSelected = categoryFilter === item.meta.code;
                return (
                  <button
                    key={item.meta.code}
                    type="button"
                    onClick={() => {
                      setCategoryFilter(isSelected ? "all" : item.meta.code);
                      setPage(1);
                    }}
                    className={`w-full text-left p-2.5 rounded-2xl border transition ${
                      isSelected
                        ? "border-indigo-500/60 bg-indigo-500/10"
                        : "border-transparent hover:border-slate-800 hover:bg-slate-900/50"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-white flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-lg border text-[10px] ${item.meta.badgeColor}`}>
                          {item.meta.label}
                        </span>
                        <span className="text-[11px] font-normal text-slate-400">
                          ({item.count})
                        </span>
                      </span>
                      <span className="font-black text-slate-200">
                        {maskAmt(item.total)}
                        {item.pending > 0 && !hideFinancials && (
                          <span className="ml-1.5 text-[10px] font-semibold text-amber-300">
                            (₹{Math.round(item.pending).toLocaleString("en-IN")} unpaid)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.meta.barColor}`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Monthly Recurring Bills */}
        <div className="rounded-3xl border border-slate-800 bg-[#111827]/85 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Repeat className="w-4 h-4 text-indigo-400" />
                Monthly Repeating Bills
              </h3>
              <p className="text-xs text-slate-400">
                EB bills, water, staff salary &amp; Wi-Fi marked as repeating monthly
              </p>
            </div>
          </div>

          {recurringTemplates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 p-6 text-center space-y-2">
              <Sparkles className="w-6 h-6 text-indigo-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-300">
                No repeating monthly bills saved yet
              </p>
              <p className="text-[11px] text-slate-500">
                Tick &ldquo;Repeat every month&rdquo; when adding EB Power Bill, Water Bill, Staff Salary, or Wi-Fi to get a 1-click shortcut here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {recurringTemplates.map(({ template, recordedThisMonth }) => {
                const meta = getExpenseCategoryMeta(template.category);
                return (
                  <div
                    key={template.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border border-slate-800 bg-slate-900/60"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white truncate">
                          {template.title}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-lg border text-[10px] font-semibold ${meta.badgeColor}`}
                        >
                          {meta.shortLabel}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {template.hostelName || "Common"} · Last: {maskAmt(template.amount)} on{" "}
                        {formatDisplayDate(template.expenseDate)}
                      </div>
                    </div>

                    {recordedThisMonth ? (
                      <Badge variant="success">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Added This Month
                      </Badge>
                    ) : (
                      canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openRepeatTemplateModal(template)}
                        >
                          Record This Month
                        </Button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4. Expenses Ledger Table (Desktop) + Responsive Cards (Mobile) */}
      <div className="rounded-3xl border border-slate-800 bg-[#111827]/85 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white">
              Expense &amp; Bill Records ({filteredExpenses.length})
            </h3>
            <p className="text-xs text-slate-400">
              Complete log with receipts, payment mode, and edit history
            </p>
          </div>
          {(categoryFilter !== "all" ||
            statusFilter !== "all" ||
            hostelFilter !== "all" ||
            modeFilter !== "all" ||
            searchQuery.trim() !== "") && (
            <button
              type="button"
              onClick={() => {
                setCategoryFilter("all");
                setStatusFilter("all");
                setHostelFilter("all");
                setModeFilter("all");
                setSearchQuery("");
                setPage(1);
              }}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
            >
              Reset Filters
            </button>
          )}
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <Receipt className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-300">No expenses found</p>
            <p className="text-xs text-slate-500">
              Try changing filters or click &ldquo;Add Expense&rdquo; to record power, water, salary, or repair bills.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View (< md) */}
            <div className="md:hidden divide-y divide-slate-800">
              {paginatedExpenses.map((exp) => {
                const meta = getExpenseCategoryMeta(exp.category);
                return (
                  <div key={exp.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold ${meta.badgeColor}`}
                          >
                            {meta.label}
                          </span>
                          {exp.isRecurring && (
                            <span className="px-2 py-0.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-[10px] font-semibold">
                              Monthly
                            </span>
                          )}
                          <Badge variant={exp.status === "PAID" ? "success" : "warning"}>
                            {exp.status === "PAID" ? "Paid" : "Pending Bill"}
                          </Badge>
                        </div>
                        <div className="text-sm font-bold text-white">{exp.title}</div>
                        <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2">
                          <span>{formatDisplayDate(exp.expenseDate)}</span>
                          <span>·</span>
                          <span>{exp.hostelName || "Common / All Properties"}</span>
                          <span>·</span>
                          <span>{getExpensePaymentModeLabel(exp.paymentMode)}</span>
                        </div>
                        {(exp.vendorName || exp.vendorPhone) && (
                          <div className="text-[11px] text-slate-300 flex items-center gap-2">
                            <span>Vendor: {exp.vendorName || "—"}</span>
                            {exp.vendorPhone && (
                              <span className="text-slate-400 flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {exp.vendorPhone}
                              </span>
                            )}
                          </div>
                        )}
                        {exp.notes && (
                          <p className="text-[11px] text-slate-400 italic">{exp.notes}</p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-base font-black text-white">{maskAmt(exp.amount)}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                      {exp.receiptImage && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewReceipt({ title: exp.title, image: exp.receiptImage! })
                          }
                          className="px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-[11px] font-semibold text-cyan-300 flex items-center gap-1"
                        >
                          <ImageIcon className="w-3.5 h-3.5" /> Bill Photo
                        </button>
                      )}
                      {canEdit && exp.status === "PENDING" && (
                        <button
                          type="button"
                          disabled={markingPaidId === exp.id}
                          onClick={() => handleMarkAsPaid(exp)}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold hover:bg-emerald-600/30 disabled:opacity-50"
                        >
                          {markingPaidId === exp.id ? "Saving..." : "Mark Paid"}
                        </button>
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEditModal(exp)}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-[11px] font-semibold text-slate-200 flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(exp)}
                          className="px-2.5 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-[11px] font-semibold text-rose-300 flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop & Tablet Table View (md+) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800 bg-slate-900/80 font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Expense &amp; Category</th>
                    <th className="p-3.5">Property</th>
                    <th className="p-3.5">Vendor / Worker</th>
                    <th className="p-3.5">Mode &amp; Status</th>
                    <th className="p-3.5 text-right">Amount</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {paginatedExpenses.map((exp) => {
                    const meta = getExpenseCategoryMeta(exp.category);
                    return (
                      <tr key={exp.id} className="hover:bg-slate-900/50 transition">
                        <td className="p-3.5 whitespace-nowrap font-semibold text-slate-200">
                          {formatDisplayDate(exp.expenseDate)}
                          {exp.recordedByName && (
                            <span className="block text-[10px] font-normal text-slate-500">
                              by {exp.recordedByName}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 max-w-xs">
                          <div className="font-bold text-white">{exp.title}</div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span
                              className={`px-2 py-0.5 rounded-lg border text-[10px] font-semibold ${meta.badgeColor}`}
                            >
                              {meta.label}
                            </span>
                            {exp.isRecurring && (
                              <span className="px-1.5 py-0.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-[10px]">
                                Monthly
                              </span>
                            )}
                          </div>
                          {exp.notes && (
                            <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                              {exp.notes}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className="flex items-center gap-1.5 text-slate-200">
                            <Building2 className="w-3.5 h-3.5 text-slate-500" />
                            {exp.hostelName || "Common / Shared"}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="text-slate-200 font-medium">
                            {exp.vendorName || "—"}
                          </div>
                          {exp.vendorPhone && (
                            <div className="text-[11px] text-slate-400">{exp.vendorPhone}</div>
                          )}
                        </td>
                        <td className="p-3.5 whitespace-nowrap space-y-1">
                          <div>
                            <Badge variant={exp.status === "PAID" ? "success" : "warning"}>
                              {exp.status === "PAID" ? "Paid" : "Pending Bill"}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {getExpensePaymentModeLabel(exp.paymentMode)}
                          </div>
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <span className="text-sm font-black text-white">
                            {maskAmt(exp.amount)}
                          </span>
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {exp.receiptImage && (
                              <button
                                type="button"
                                title="View Receipt Photo"
                                onClick={() =>
                                  setPreviewReceipt({
                                    title: exp.title,
                                    image: exp.receiptImage!,
                                  })
                                }
                                className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 text-cyan-300 hover:border-cyan-500/50 transition"
                              >
                                <ImageIcon className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canEdit && exp.status === "PENDING" && (
                              <button
                                type="button"
                                disabled={markingPaidId === exp.id}
                                onClick={() => handleMarkAsPaid(exp)}
                                className="px-2 py-1 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold hover:bg-emerald-600/30 disabled:opacity-50"
                              >
                                {markingPaidId === exp.id ? "..." : "Mark Paid"}
                              </button>
                            )}
                            {canEdit && (
                              <button
                                type="button"
                                title="Edit Expense"
                                onClick={() => openEditModal(exp)}
                                className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:border-indigo-500/50 transition"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                title="Delete Expense"
                                onClick={() => setDeleteTarget(exp)}
                                className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-4 sm:px-6 py-4 border-t border-slate-800">
              <PaginationBar
                currentPage={safePage}
                totalItems={filteredExpenses.length}
                pageSize={pageSize}
                onPageChange={setPage}
                itemLabel="expenses"
              />
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Expense Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetModal();
        }}
        title={editingId ? "Edit Expense / Bill" : "Add New Expense / Bill"}
        description="Record power bills, water tankers, staff salaries, repairs, or daily essentials."
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveExpense} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 font-semibold">
              {formError}
            </div>
          )}

          {/* 1-tap Core Category Picker */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Popular Categories (1-Tap)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {coreQuickCategories.map((cat) => {
                const active = formCategory === cat.code;
                return (
                  <button
                    key={cat.code}
                    type="button"
                    onClick={() => setFormCategory(cat.code)}
                    className={`p-2 rounded-xl border text-left transition ${
                      active
                        ? "border-indigo-500 bg-indigo-500/20 text-white"
                        : "border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="text-xs font-bold">{cat.label}</div>
                    <div className="text-[10px] text-slate-400 truncate">{cat.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Full Category List
              </label>
              <CustomSelect
                value={formCategory}
                onValueChange={setFormCategory}
                options={EXPENSE_CATEGORIES.map((c) => ({
                  value: c.code,
                  label: c.label,
                }))}
                triggerClassName="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Property
              </label>
              <CustomSelect
                value={formHostelId}
                onValueChange={setFormHostelId}
                options={[
                  { value: "common", label: "Common / All Properties" },
                  ...hostels.map((h) => ({ value: h.id, label: h.name })),
                ]}
                triggerClassName="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              What did you spend on? *
            </label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g., EB Power Bill March, Water Tanker 6000L, Electrician Raju Room 114"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                required
                min="1"
                step="0.01"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="e.g., 4500"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Bill / Spend Date *
              </label>
              <DatePicker
                value={formDate}
                onChange={setFormDate}
                triggerClassName="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Payment Mode
              </label>
              <CustomSelect
                value={formPaymentMode}
                onValueChange={setFormPaymentMode}
                options={EXPENSE_PAYMENT_MODES.map((m) => ({
                  value: m.code,
                  label: m.label,
                }))}
                triggerClassName="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs"
              />
            </div>
          </div>

          {/* Paid vs Unpaid Bill Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Payment Status
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setFormStatus("PAID")}
                className={`p-2.5 rounded-xl border text-xs font-bold transition ${
                  formStatus === "PAID"
                    ? "bg-emerald-500/15 border-emerald-500 text-emerald-300"
                    : "bg-slate-900 border-slate-700 text-slate-400"
                }`}
              >
                Paid Already (Deducted from Profit)
              </button>
              <button
                type="button"
                onClick={() => setFormStatus("PENDING")}
                className={`p-2.5 rounded-xl border text-xs font-bold transition ${
                  formStatus === "PENDING"
                    ? "bg-amber-500/15 border-amber-500 text-amber-300"
                    : "bg-slate-900 border-slate-700 text-slate-400"
                }`}
              >
                Pending / Unpaid Bill (Pay Later)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Vendor / Worker / Staff Name (Optional)
              </label>
              <input
                type="text"
                value={formVendorName}
                onChange={(e) => setFormVendorName(e.target.value)}
                placeholder="e.g., Raju Electrician, Sri Sai Water Tankers"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Vendor Phone (Optional)
              </label>
              <input
                type="text"
                value={formVendorPhone}
                onChange={(e) => setFormVendorPhone(e.target.value)}
                placeholder="10-digit phone number"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Notes / Room Number (Optional)
              </label>
              <textarea
                rows={2}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="e.g., Replaced ceiling capacitor in Room 112"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Bill / Receipt Photo (Optional)
              </label>
              <div className="flex items-center gap-2">
                <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-slate-700 bg-slate-900/70 hover:border-indigo-500 text-xs text-slate-300 transition">
                  <Upload className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    {compressingImage
                      ? "Compressing..."
                      : formReceiptImage
                      ? "Replace Bill Photo"
                      : "Upload Bill Photo"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptUpload}
                    className="hidden"
                  />
                </label>
                {formReceiptImage && (
                  <button
                    type="button"
                    onClick={() => setFormReceiptImage(null)}
                    className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                    title="Remove photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {formReceiptImage && (
                <div className="mt-2">
                  <img
                    src={formReceiptImage}
                    alt="Receipt preview"
                    className="h-16 w-24 object-cover rounded-lg border border-slate-700"
                  />
                </div>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-900/60 cursor-pointer">
            <input
              type="checkbox"
              checked={formIsRecurring}
              onChange={(e) => setFormIsRecurring(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500"
            />
            <div>
              <div className="text-xs font-bold text-white">
                Repeat this every month (Monthly Fixed Bill)
              </div>
              <div className="text-[11px] text-slate-400">
                Adds a 1-click &ldquo;Record This Month&rdquo; shortcut for Power Bills, Salaries, Water, or Wi-Fi.
              </div>
            </div>
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                resetModal();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="glow" isLoading={saving} disabled={compressingImage}>
              {editingId ? "Save Changes" : "Save Expense"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Receipt Preview Lightbox Modal */}
      <Modal
        isOpen={Boolean(previewReceipt)}
        onClose={() => setPreviewReceipt(null)}
        title={previewReceipt ? `Receipt: ${previewReceipt.title}` : "Receipt"}
        maxWidth="xl"
      >
        {previewReceipt && (
          <div className="space-y-3">
            <img
              src={previewReceipt.image}
              alt={previewReceipt.title}
              className="w-full max-h-[70vh] object-contain rounded-2xl border border-slate-800 bg-slate-950"
            />
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setPreviewReceipt(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Expense?"
        maxWidth="md"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/10">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-200 space-y-1">
                <p>
                  Are you sure you want to permanently delete{" "}
                  <strong>{deleteTarget.title}</strong> ({maskAmt(deleteTarget.amount)})?
                </p>
                <p className="text-slate-400">
                  This action is logged in the audit history and updates Net Profit immediately.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={deleting}
                onClick={handleConfirmDelete}
              >
                Delete Expense
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
