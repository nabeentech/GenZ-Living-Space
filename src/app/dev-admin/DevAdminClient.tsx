"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Database,
  Sparkles,
  RefreshCw,
  Search,
  Trash2,
  Edit3,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Save,
  Lock,
  Unlock,
  Key,
  Archive,
  ArrowRight,
  X,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { TableDefinition, CATEGORY_LABELS } from "@/lib/database-studio";

interface DevAdminClientProps {
  initialIsAuthenticated: boolean;
  initialTables: (TableDefinition & { count: number })[];
  initialTotalRecords: number;
}

export default function DevAdminClient({
  initialIsAuthenticated,
  initialTables,
  initialTotalRecords,
}: DevAdminClientProps) {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(initialIsAuthenticated);
  const [passcode, setPasscode] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  // Studio Tables State
  const [tables, setTables] = useState(initialTables);
  const [totalRecords, setTotalRecords] = useState(initialTotalRecords);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [tableSearch, setTableSearch] = useState<string>("");
  const [selectedTable, setSelectedTable] = useState<string>("booking");

  // Records & Pagination
  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [isLoadingRows, setIsLoadingRows] = useState<boolean>(false);
  const [recordSearch, setRecordSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  // Modals
  const [inspectRecord, setInspectRecord] = useState<any | null>(null);
  const [editRecord, setEditRecord] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    ids: string[];
  }>({ isOpen: false, ids: [] });

  // Handover Cleanup Modal
  const [isCleanupOpen, setIsCleanupOpen] = useState<boolean>(false);
  const [cleanupLoading, setCleanupLoading] = useState<boolean>(false);
  const [cleanupResult, setCleanupResult] = useState<any | null>(null);
  const [cleanupOptions, setCleanupOptions] = useState({
    clearBookings: true,
    resetBeds: true,
    clearCustomers: true,
    clearTicketsAndTasks: true,
    clearAuditLogs: true,
    resetCoupons: true,
  });

  // Notifications & Copy
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Authenticate Dev Master Key
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;
    setIsAuthenticating(true);
    setAuthError("");
    try {
      const res = await fetch("/api/dev-admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setIsAuthenticated(true);
        refreshTables();
      } else {
        setAuthError(json.message || "Invalid Developer Master Key.");
      }
    } catch {
      setAuthError("Failed to authenticate. Check server connection.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Lock Dev Terminal
  const handleLogout = async () => {
    await fetch("/api/dev-admin/auth", { method: "DELETE" });
    setIsAuthenticated(false);
    setPasscode("");
  };

  // Filtered tables list
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchesCategory =
        activeCategory === "all" || t.category === activeCategory;
      const matchesSearch =
        !tableSearch ||
        t.name.toLowerCase().includes(tableSearch.toLowerCase()) ||
        t.description.toLowerCase().includes(tableSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [tables, activeCategory, tableSearch]);

  const currentTableDef = useMemo(() => {
    return tables.find((t) => t.tableName === selectedTable) || tables[0];
  }, [tables, selectedTable]);

  // Refresh tables metadata
  const refreshTables = async () => {
    try {
      const res = await fetch("/api/dev-admin/database/tables");
      const json = await res.json();
      if (json.success) {
        setTables(json.data.tables);
        setTotalRecords(json.data.totalRecords);
      }
    } catch (err) {
      console.error("Failed to refresh tables:", err);
    }
  };

  // Fetch rows for the active table
  const fetchRows = async () => {
    if (!isAuthenticated || !selectedTable) return;
    setIsLoadingRows(true);
    setSelectedRowIds([]);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: recordSearch,
      });
      const res = await fetch(`/api/dev-admin/database/${selectedTable}?${params}`);
      const json = await res.json();
      if (json.success) {
        setRows(json.data.rows);
        setColumns(json.data.columns);
        setTotalRows(json.data.pagination.total);
      } else {
        setNotification({ type: "error", text: json.message || "Failed to load records" });
      }
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to query table" });
    } finally {
      setIsLoadingRows(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchRows();
    }
  }, [isAuthenticated, selectedTable, page, limit]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRows();
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRowIds(rows.map((r) => r.id).filter(Boolean));
    } else {
      setSelectedRowIds([]);
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Execute Deletion
  const confirmDelete = async () => {
    const { ids } = deleteConfirmation;
    if (ids.length === 0) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/dev-admin/database/${selectedTable}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const json = await res.json();
      if (json.success) {
        setNotification({
          type: "success",
          text: json.message || `Deleted ${ids.length} record(s)`,
        });
        setDeleteConfirmation({ isOpen: false, ids: [] });
        setSelectedRowIds([]);
        fetchRows();
        refreshTables();
      } else {
        setNotification({ type: "error", text: json.message || "Failed to delete" });
      }
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Deletion error" });
    } finally {
      setIsDeleting(false);
    }
  };

  // Start Edit
  const handleStartEdit = (row: any) => {
    setEditRecord(row);
    const editable: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
      if (!["id", "createdAt", "updatedAt"].includes(k)) {
        editable[k] = v === null ? "" : v;
      }
    }
    setEditForm(editable);
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editRecord) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(
        `/api/dev-admin/database/${selectedTable}/${editRecord.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editForm),
        }
      );
      const json = await res.json();
      if (json.success) {
        setNotification({
          type: "success",
          text: `Record '${editRecord.id}' updated successfully`,
        });
        setEditRecord(null);
        fetchRows();
        refreshTables();
      } else {
        setNotification({ type: "error", text: json.message || "Update failed" });
      }
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Update error" });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handover Cleanup
  const handleRunCleanup = async () => {
    setCleanupLoading(true);
    try {
      const res = await fetch("/api/dev-admin/database/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanupOptions),
      });
      const json = await res.json();
      if (json.success) {
        setCleanupResult(json.data);
        setNotification({
          type: "success",
          text: "Handover cleanup completed successfully!",
        });
        refreshTables();
        fetchRows();
      } else {
        setNotification({ type: "error", text: json.message || "Cleanup failed" });
      }
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Cleanup error" });
    } finally {
      setCleanupLoading(false);
    }
  };

  // Cell Formatter
  const renderCellValue = (key: string, val: any) => {
    if (val === null || val === undefined) {
      return <span className="text-slate-600 italic">null</span>;
    }
    if (typeof val === "boolean") {
      return (
        <Badge variant={val ? "success" : "default"} size="sm">
          {val ? "true" : "false"}
        </Badge>
      );
    }
    if (typeof val === "number") {
      if (key.toLowerCase().includes("amount") || key.toLowerCase().includes("price") || key.toLowerCase().includes("fee") || key.toLowerCase().includes("deposit")) {
        return <span className="font-semibold text-emerald-400">₹{val.toLocaleString()}</span>;
      }
      return <span className="font-mono text-slate-300">{val}</span>;
    }
    if (typeof val === "string") {
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
        const d = new Date(val);
        return (
          <span className="text-xs text-slate-300 whitespace-nowrap">
            {d.toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        );
      }
      if (["CONFIRMED", "PAID", "CAPTURED", "ACTIVE", "COMPLETED", "APPROVED"].includes(val)) {
        return <Badge variant="success" size="sm">{val}</Badge>;
      }
      if (["PENDING", "PAYMENT_PENDING", "IN_PROGRESS", "HOLD"].includes(val)) {
        return <Badge variant="warning" size="sm">{val}</Badge>;
      }
      if (["CANCELLED", "FAILED", "REJECTED", "EXPIRED"].includes(val)) {
        return <Badge variant="danger" size="sm">{val}</Badge>;
      }
      if (["AVAILABLE"].includes(val)) {
        return <Badge variant="cyan" size="sm">{val}</Badge>;
      }
      if (["OCCUPIED", "MAINTENANCE"].includes(val)) {
        return <Badge variant="indigo" size="sm">{val}</Badge>;
      }
      if (key === "id" || key.endsWith("Id")) {
        return (
          <span className="font-mono text-[11px] text-purple-400 bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-900/60 truncate max-w-[120px] inline-block">
            {val.slice(0, 10)}...
          </span>
        );
      }
      return <span className="truncate max-w-[200px] inline-block text-slate-300">{val}</span>;
    }
    if (typeof val === "object") {
      return (
        <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
          [Object]
        </span>
      );
    }
    return String(val);
  };

  const totalPages = Math.ceil(totalRows / limit) || 1;

  // -------------------------------------------------------------
  // VIEW 1: LOCKED DEV TERMINAL (Auth Gate)
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#07090E] flex flex-col justify-center items-center p-4 antialiased text-slate-100">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 mb-2">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Developer Database Terminal
            </h1>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Private developer root console for GenZ Living Space. Separate from platform owner & Super Admin.
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-[#0E131F]/95 space-y-5 shadow-2xl"
          >
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-xs text-slate-400">
              <Key className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Enter Developer Master Key</span>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-xs text-red-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Master Dev Passcode
              </label>
              <input
                type="password"
                placeholder="Enter secret developer key..."
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                autoFocus
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono tracking-wider"
              />
              <span className="text-[11px] text-slate-500 block pt-1">
                Default key is configured in your <code>.env</code> file.
              </span>
            </div>

            <Button
              variant="glow"
              size="lg"
              type="submit"
              isLoading={isAuthenticating}
              className="w-full"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Unlock Dev Terminal
            </Button>
          </form>

          <div className="text-center">
            <Link
              href="/"
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1"
            >
              <span>← Return to Public Website</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: UNLOCKED DEV DATABASE STUDIO & ORM
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 p-4 sm:p-6 lg:p-8 antialiased space-y-6">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between animate-in fade-in slide-in-from-top-2 ${
            notification.type === "success"
              ? "bg-emerald-950/70 border-emerald-500/40 text-emerald-200"
              : notification.type === "error"
              ? "bg-red-950/70 border-red-500/40 text-red-200"
              : "bg-indigo-950/70 border-indigo-500/40 text-indigo-200"
          }`}
        >
          <div className="flex items-center gap-3">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <p className="text-sm font-medium">{notification.text}</p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Dev Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800/80 bg-[#0E131F]/90">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="inline-flex items-center justify-center p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Database className="w-5 h-5" />
            </span>
            <Badge variant="indigo" size="md">DEV ADMIN ROOT CONSOLE</Badge>
            <Badge variant="default" size="sm">Private Access</Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Developer Database Studio & ORM
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Direct database console for developer use. Isolated from client Super Admin accounts. Safely browse tables, update fields, purge test records, and prepare clean handover data.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            size="md"
            onClick={() => {
              refreshTables();
              fetchRows();
            }}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>

          <Button
            variant="glow"
            size="md"
            onClick={() => {
              setCleanupResult(null);
              setIsCleanupOpen(true);
            }}
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            ✨ Handover Cleanup Tool
          </Button>

          <Button
            variant="ghost"
            size="md"
            onClick={handleLogout}
            leftIcon={<Lock className="w-4 h-4 text-purple-400" />}
          >
            Lock Terminal
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/40">
          <span className="text-xs text-slate-400 font-medium">Total Database Records</span>
          <p className="text-2xl font-black text-white mt-1">
            {totalRecords.toLocaleString()}
          </p>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/40">
          <span className="text-xs text-slate-400 font-medium">Prisma Models</span>
          <p className="text-2xl font-black text-purple-400 mt-1">20 Tables</p>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/40">
          <span className="text-xs text-slate-400 font-medium">Active Table</span>
          <p className="text-2xl font-black text-indigo-400 mt-1 truncate">
            {currentTableDef?.name || "None"}
          </p>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/40">
          <span className="text-xs text-slate-400 font-medium">Matching Records</span>
          <p className="text-2xl font-black text-emerald-400 mt-1">
            {totalRows.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Studio 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Col: Table Selector Navigator */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-[#0B0F19]/90 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Database Tables
              </h3>
              <span className="text-xs text-purple-400 font-bold">
                {tables.length} Total
              </span>
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {Object.entries(CATEGORY_LABELS).map(([catKey, catInfo]) => (
                <button
                  key={catKey}
                  onClick={() => setActiveCategory(catKey)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all ${
                    activeCategory === catKey
                      ? "bg-purple-600 text-white shadow-sm"
                      : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  {catInfo.label.replace(" Tables", "")}
                </button>
              ))}
            </div>

            {/* Filter Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter table name..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Scrollable Table List */}
            <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredTables.map((t) => {
                const isSelected = selectedTable === t.tableName;
                return (
                  <button
                    key={t.tableName}
                    onClick={() => {
                      setSelectedTable(t.tableName);
                      setPage(1);
                      setRecordSearch("");
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group ${
                      isSelected
                        ? "bg-purple-950/70 border-purple-500 shadow-glow text-white ring-1 ring-purple-500/50"
                        : "bg-slate-900/50 border-slate-800/80 text-slate-300 hover:bg-slate-900 hover:border-slate-700"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm truncate">{t.name}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 line-clamp-1 block mt-0.5">
                        {t.description}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        isSelected
                          ? "bg-purple-500/30 text-purple-200 border border-purple-400/30"
                          : t.count > 0
                          ? "bg-slate-800 text-slate-300"
                          : "bg-slate-900 text-slate-600"
                      }`}
                    >
                      {t.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Col: Table Data Grid (ORM View) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="glass-panel p-5 rounded-3xl border border-slate-800 bg-[#0E131F]/90 space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold text-white">
                    {currentTableDef?.name}
                  </h2>
                  <Badge variant="indigo" size="sm">
                    {totalRows} {totalRows === 1 ? "Record" : "Records"}
                  </Badge>
                  {currentTableDef?.canTruncate && (
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                      Purgeable
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {currentTableDef?.description}
                </p>
              </div>

              {/* Search within records */}
              <form
                onSubmit={handleSearchSubmit}
                className="flex items-center gap-2"
              >
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={`Search ${currentTableDef?.name}...`}
                    value={recordSearch}
                    onChange={(e) => setRecordSearch(e.target.value)}
                    className="w-48 sm:w-60 bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <Button variant="secondary" size="sm" type="submit">
                  Filter
                </Button>
              </form>
            </div>

            {/* Multi-Select Action Bar */}
            {selectedRowIds.length > 0 && (
              <div className="p-3 rounded-xl bg-purple-950/80 border border-purple-500/50 flex items-center justify-between animate-in fade-in">
                <span className="text-xs font-bold text-purple-200">
                  {selectedRowIds.length} {selectedRowIds.length === 1 ? "record" : "records"} selected
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedRowIds([])}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() =>
                      setDeleteConfirmation({
                        isOpen: true,
                        ids: selectedRowIds,
                      })
                    }
                    leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  >
                    Delete Selected ({selectedRowIds.length})
                  </Button>
                </div>
              </div>
            )}

            {/* The Table Data Grid */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/60 custom-scrollbar">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#111827] text-slate-400 uppercase font-black tracking-wider text-[11px] border-b border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          rows.length > 0 &&
                          selectedRowIds.length === rows.length
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                    </th>
                    {columns.slice(0, 7).map((col) => (
                      <th key={col} className="p-3 font-extrabold whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                    <th className="p-3 text-right font-extrabold whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {isLoadingRows ? (
                    <tr>
                      <td
                        colSpan={columns.slice(0, 7).length + 2}
                        className="p-12 text-center text-slate-400"
                      >
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-400 mb-2" />
                        <span>Querying {currentTableDef?.name} records...</span>
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={columns.slice(0, 7).length + 2}
                        className="p-12 text-center text-slate-500 space-y-2"
                      >
                        <Database className="w-8 h-8 mx-auto text-slate-600" />
                        <p className="font-semibold text-slate-400 text-sm">
                          No records found in table '{currentTableDef?.name}'
                        </p>
                        <p className="text-xs text-slate-500">
                          {recordSearch
                            ? "Try clearing your search query."
                            : "This table is currently empty."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => {
                      const isSelected = selectedRowIds.includes(row.id);
                      return (
                        <tr
                          key={row.id || Math.random()}
                          className={`transition-colors hover:bg-slate-900/80 ${
                            isSelected ? "bg-purple-950/40" : ""
                          }`}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleRow(row.id)}
                              className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                          </td>
                          {columns.slice(0, 7).map((col) => (
                            <td key={col} className="p-3 max-w-[220px]">
                              {renderCellValue(col, row[col])}
                            </td>
                          ))}
                          <td className="p-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setInspectRecord(row)}
                                title="Inspect JSON"
                                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleStartEdit(row)}
                                title="Edit Record"
                                className="p-1.5 rounded-lg bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 hover:text-white hover:bg-indigo-900 transition"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteConfirmation({
                                    isOpen: true,
                                    ids: [row.id],
                                  })
                                }
                                title="Delete Record"
                                className="p-1.5 rounded-lg bg-red-950/60 border border-red-800/60 text-red-400 hover:text-white hover:bg-red-900 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>
                  Showing {Math.min((page - 1) * limit + 1, totalRows)} -{" "}
                  {Math.min(page * limit, totalRows)} of {totalRows}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Previous
                </Button>
                <span className="font-bold text-white px-2">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Inspect Record (Full JSON) */}
      <Modal
        isOpen={Boolean(inspectRecord)}
        onClose={() => setInspectRecord(null)}
        title={`Inspect ${currentTableDef?.name} Record`}
        description={`Primary Key ID: ${inspectRecord?.id || "N/A"}`}
        maxWidth="xl"
      >
        {inspectRecord && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Complete JSON Representation</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleCopy(JSON.stringify(inspectRecord, null, 2), "inspect")
                }
                leftIcon={
                  copiedId === "inspect" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )
                }
              >
                {copiedId === "inspect" ? "Copied" : "Copy JSON"}
              </Button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-purple-300 overflow-x-auto max-h-[420px] custom-scrollbar">
              {JSON.stringify(inspectRecord, null, 2)}
            </pre>
          </div>
        )}
      </Modal>

      {/* MODAL 2: Edit Record */}
      <Modal
        isOpen={Boolean(editRecord)}
        onClose={() => setEditRecord(null)}
        title={`Edit ${currentTableDef?.name} Record`}
        description={`Record ID: ${editRecord?.id}`}
        maxWidth="lg"
      >
        {editRecord && (
          <div className="space-y-4">
            <div className="space-y-3 max-h-[440px] overflow-y-auto pr-2 custom-scrollbar">
              {Object.entries(editForm).map(([field, val]) => (
                <div key={field} className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    {field}
                  </label>
                  {typeof val === "boolean" ? (
                    <select
                      value={val ? "true" : "false"}
                      onChange={(e) =>
                        setEditForm({ ...editForm, [field]: e.target.value === "true" })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : typeof val === "number" ? (
                    <input
                      type="number"
                      value={val}
                      onChange={(e) =>
                        setEditForm({ ...editForm, [field]: Number(e.target.value) })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  ) : (
                    <input
                      type="text"
                      value={val || ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, [field]: e.target.value })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
              <Button
                variant="outline"
                size="md"
                onClick={() => setEditRecord(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                isLoading={isSavingEdit}
                onClick={handleSaveEdit}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: Delete Confirmation */}
      <Modal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, ids: [] })}
        title="Confirm Record Deletion"
        description={`You are about to delete ${deleteConfirmation.ids.length} record(s) from '${currentTableDef?.name}'`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 space-y-2">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Permanent Deletion Warning</span>
            </div>
            <p className="text-xs text-red-200/90 leading-relaxed">
              This action cannot be undone. Any cascade relations will be cleaned automatically to protect database integrity.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => setDeleteConfirmation({ isOpen: false, ids: [] })}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              isLoading={isDeleting}
              onClick={confirmDelete}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Confirm & Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 4: Handover Test Data Cleanup Tool */}
      <Modal
        isOpen={isCleanupOpen}
        onClose={() => setIsCleanupOpen(false)}
        title="✨ Client Handover Test Data Cleanup"
        description="Clean dummy bookings and operational tests to hand over a fresh production platform."
        maxWidth="xl"
      >
        <div className="space-y-5">
          {/* Backup Notice */}
          <div className="p-4 rounded-2xl bg-indigo-950/60 border border-indigo-500/40 flex items-start gap-3">
            <Archive className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-200">
              <span className="font-bold block text-white text-sm mb-0.5">
                Automatic Backup Snapshot
              </span>
              Before running any deletion, an automatic timestamped database backup snapshot (<code>dev.db.backup.*</code>) will be created in the <code>prisma/</code> directory.
            </div>
          </div>

          {/* Cleanup Options Checkboxes */}
          {!cleanupResult ? (
            <div className="space-y-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={cleanupOptions.clearBookings}
                  onChange={(e) =>
                    setCleanupOptions({ ...cleanupOptions, clearBookings: e.target.checked })
                  }
                  className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-white block">
                    Clear Test Bookings & Financial Records
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Purges Bookings, Invoices, Payments, Refunds, Extensions, Additional Charges, and Reviews.
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={cleanupOptions.resetBeds}
                  onChange={(e) =>
                    setCleanupOptions({ ...cleanupOptions, resetBeds: e.target.checked })
                  }
                  className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-white block">
                    Reset All Bed Inventory to AVAILABLE
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Sets all bed occupancy states to AVAILABLE and clears any assigned occupant ID.
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={cleanupOptions.clearCustomers}
                  onChange={(e) =>
                    setCleanupOptions({ ...cleanupOptions, clearCustomers: e.target.checked })
                  }
                  className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-white block">
                    Clear Dummy Customer Accounts
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Deletes accounts with role CUSTOMER. Staff, Property Managers, and Super Admins are strictly preserved.
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={cleanupOptions.clearTicketsAndTasks}
                  onChange={(e) =>
                    setCleanupOptions({ ...cleanupOptions, clearTicketsAndTasks: e.target.checked })
                  }
                  className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-white block">
                    Clear Support Tickets & Housekeeping Tasks
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Wipes dummy complaints, front desk inquiries, and room cleaning tasks.
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={cleanupOptions.clearAuditLogs}
                  onChange={(e) =>
                    setCleanupOptions({ ...cleanupOptions, clearAuditLogs: e.target.checked })
                  }
                  className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-white block">
                    Clear System Audit Logs
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Cleans historical test audit records for a fresh administrative ledger.
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={cleanupOptions.resetCoupons}
                  onChange={(e) =>
                    setCleanupOptions({ ...cleanupOptions, resetCoupons: e.target.checked })
                  }
                  className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-white block">
                    Reset Promotional Coupon Counters
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Resets redemption used counts to 0 for GENZFIRST, COMMUNITY10, etc.
                  </span>
                </div>
              </label>
            </div>
          ) : (
            <div className="space-y-4 p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
                <CheckCircle2 className="w-5 h-5" />
                <span>Handover Cleanup Completed!</span>
              </div>
              <p className="text-slate-300">
                The platform database has been purged of test records. Core property settings, rooms, beds, pricing, and staff accounts remain intact.
              </p>
              {cleanupResult.backupCreated && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-indigo-300">
                  Backup saved as: {cleanupResult.backupFileName}
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                {Object.entries(cleanupResult.results || {}).map(([k, v]) => (
                  <div key={k} className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">{k}</span>
                    <span className="text-base font-bold text-white">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsCleanupOpen(false)}
            >
              {cleanupResult ? "Close" : "Cancel"}
            </Button>
            {!cleanupResult && (
              <Button
                variant="danger"
                size="md"
                isLoading={cleanupLoading}
                onClick={handleRunCleanup}
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                Execute Handover Purge
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
