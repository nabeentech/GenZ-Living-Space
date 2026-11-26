"use client";

import React, { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import CustomSelect from "@/components/ui/CustomSelect";
import DatePicker from "@/components/ui/DatePicker";
import Modal from "@/components/ui/Modal";
import PaginationBar from "@/components/ui/PaginationBar";
import {
  THEATER_SLOTS,
  addDaysToDateKey,
  formatTheaterDate,
  getTheaterSlotMeta,
} from "@/lib/home-theater";
import {
  Film,
  Calendar,
  Clock,
  Users,
  Plus,
  Lock,
  CheckCircle2,
  XCircle,
  Search,
  Trash2,
  Phone,
  Ban,
  Unlock,
  AlertTriangle,
} from "lucide-react";

export interface AdminTheaterBookingRow {
  id: string;
  bookingCode: string;
  residentName: string;
  residentPhone: string | null;
  roomBedLabel: string | null;
  slotDateKey: string;
  slotKey: string;
  title: string | null;
  guestCount: number;
  notes: string | null;
  status: string;
  bookedByRole: string;
  bookedByName: string | null;
  createdAt: string;
}

export interface ActiveResidentOption {
  bookingId: string;
  guestName: string;
  guestPhone: string;
  roomBedLabel: string;
}

interface AdminTheaterClientProps {
  initialDate: string;
  initialBookings: AdminTheaterBookingRow[];
  activeResidents: ActiveResidentOption[];
  canEdit: boolean;
  canDelete: boolean;
}

const mapRowFromApi = (b: any): AdminTheaterBookingRow => ({
  id: b.id,
  bookingCode: b.bookingCode,
  residentName: b.residentName,
  residentPhone: b.residentPhone || null,
  roomBedLabel: b.roomBedLabel || null,
  slotDateKey: b.slotDateKey,
  slotKey: b.slotKey,
  title: b.title || null,
  guestCount: Number(b.guestCount || 1),
  notes: b.notes || null,
  status: b.status,
  bookedByRole: b.bookedByRole || "RESIDENT",
  bookedByName: b.bookedByName || null,
  createdAt:
    typeof b.createdAt === "string"
      ? b.createdAt
      : new Date(b.createdAt).toISOString(),
});

export const AdminTheaterClient: React.FC<AdminTheaterClientProps> = ({
  initialDate,
  initialBookings,
  activeResidents,
  canEdit,
  canDelete,
}) => {
  const [bookings, setBookings] = useState<AdminTheaterBookingRow[]>(initialBookings);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<"BOOK" | "BLOCK">("BOOK");
  const [residentMode, setResidentMode] = useState<"SELECT" | "MANUAL">("SELECT");
  const [selectedResidentBookingId, setSelectedResidentBookingId] = useState(
    activeResidents[0]?.bookingId || ""
  );
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualRoomBed, setManualRoomBed] = useState("");
  const [formDate, setFormDate] = useState(initialDate);
  const [formSlotKey, setFormSlotKey] = useState("EVENING");
  const [formTitle, setFormTitle] = useState("");
  const [formGuestCount, setFormGuestCount] = useState(2);
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminTheaterBookingRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Selected day board slots
  const selectedDayBookings = useMemo(
    () =>
      bookings.filter(
        (b) =>
          b.slotDateKey === selectedDate &&
          ["BOOKED", "BLOCKED", "COMPLETED"].includes(b.status)
      ),
    [bookings, selectedDate]
  );

  // Metrics
  const todayBookedCount = useMemo(
    () =>
      bookings.filter(
        (b) =>
          b.slotDateKey === initialDate &&
          ["BOOKED", "COMPLETED"].includes(b.status)
      ).length,
    [bookings, initialDate]
  );

  const todayAvailableCount = useMemo(() => {
    const occupiedToday = bookings.filter(
      (b) =>
        b.slotDateKey === initialDate &&
        ["BOOKED", "BLOCKED", "COMPLETED"].includes(b.status)
    ).length;
    return Math.max(0, THEATER_SLOTS.length - occupiedToday);
  }, [bookings, initialDate]);

  const upcomingBookedCount = useMemo(
    () =>
      bookings.filter(
        (b) => b.slotDateKey >= initialDate && b.status === "BOOKED"
      ).length,
    [bookings, initialDate]
  );

  const blockedOrCompletedCount = useMemo(
    () =>
      bookings.filter((b) => ["BLOCKED", "COMPLETED"].includes(b.status)).length,
    [bookings]
  );

  // Filtered table rows
  const filteredBookings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bookings.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (q) {
        const hay = `${b.bookingCode} ${b.residentName} ${b.residentPhone || ""} ${
          b.roomBedLabel || ""
        } ${b.title || ""} ${b.notes || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [bookings, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedBookings = useMemo(
    () => filteredBookings.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredBookings, safePage]
  );

  const openBookModal = (action: "BOOK" | "BLOCK", slotKey?: string, dateKey?: string) => {
    setModalAction(action);
    setResidentMode(activeResidents.length > 0 ? "SELECT" : "MANUAL");
    setSelectedResidentBookingId(activeResidents[0]?.bookingId || "");
    setManualName("");
    setManualPhone("");
    setManualRoomBed("");
    setFormDate(dateKey || selectedDate);
    setFormSlotKey(slotKey || "EVENING");
    setFormTitle(action === "BLOCK" ? "Maintenance / Cleaning" : "");
    setFormGuestCount(2);
    setFormNotes("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (modalAction === "BOOK" && residentMode === "MANUAL" && manualName.trim().length < 2) {
      setFormError("Please enter the resident name.");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        action: modalAction,
        slotDateKey: formDate,
        slotKey: formSlotKey,
        title: formTitle.trim() || undefined,
        guestCount: formGuestCount,
        notes: formNotes.trim() || undefined,
      };
      if (modalAction === "BOOK") {
        if (residentMode === "SELECT" && selectedResidentBookingId) {
          payload.residentBookingId = selectedResidentBookingId;
        } else {
          payload.residentName = manualName.trim();
          payload.residentPhone = manualPhone.trim() || null;
          payload.roomBedLabel = manualRoomBed.trim() || null;
        }
      }

      const res = await fetch("/api/admin/theater", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to save Home Theater slot.");
        return;
      }

      const created = mapRowFromApi(data.booking);
      setBookings((prev) => [created, ...prev]);
      setSelectedDate(created.slotDateKey);
      setIsModalOpen(false);
      setBanner({
        type: "success",
        text:
          created.status === "BLOCKED"
            ? `Blocked ${getTheaterSlotMeta(created.slotKey).label} on ${formatTheaterDate(
                created.slotDateKey
              )}.`
            : `Reserved ${getTheaterSlotMeta(created.slotKey).label} for ${
                created.residentName
              } (${created.bookingCode}).`,
      });
    } catch {
      setFormError("Network error while saving slot.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (
    row: AdminTheaterBookingRow,
    nextStatus: "COMPLETED" | "CANCELLED"
  ) => {
    setBusyId(row.id);
    setBanner(null);
    try {
      const res = await fetch(`/api/admin/theater/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ type: "error", text: data.error || "Failed to update slot." });
        return;
      }
      const updated = mapRowFromApi(data.booking);
      setBookings((prev) => prev.map((b) => (b.id === row.id ? updated : b)));
      setBanner({
        type: "success",
        text:
          nextStatus === "COMPLETED"
            ? `Marked ${row.bookingCode} as Completed.`
            : row.status === "BLOCKED"
            ? `Unblocked ${getTheaterSlotMeta(row.slotKey).label}.`
            : `Cancelled ${row.bookingCode} and freed the slot.`,
      });
    } catch {
      setBanner({ type: "error", text: "Network error while updating booking." });
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/admin/theater/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ type: "error", text: data.error || "Failed to delete booking." });
        return;
      }
      setBookings((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      setBanner({
        type: "success",
        text: `Deleted ${deleteTarget.bookingCode}.`,
      });
      setDeleteTarget(null);
    } catch {
      setBanner({ type: "error", text: "Network error while deleting record." });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
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
            ✕
          </button>
        </div>
      )}

      {/* 1. Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-indigo-500/30 bg-indigo-500/10 p-5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
              Today&apos;s Shows
            </span>
            <Film className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-white">{todayBookedCount}</div>
          <p className="text-[11px] text-indigo-200/80">Reserved slots today</p>
        </div>

        <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              Open Today
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-300">
            {todayAvailableCount}
          </div>
          <p className="text-[11px] text-emerald-200/80">Free slots left today</p>
        </div>

        <div className="rounded-3xl border border-cyan-500/30 bg-cyan-500/10 p-5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              Upcoming Shows
            </span>
            <Calendar className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-cyan-200">{upcomingBookedCount}</div>
          <p className="text-[11px] text-cyan-200/80">Active resident reservations</p>
        </div>

        <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Done / Blocked
            </span>
            <Lock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-white">
            {blockedOrCompletedCount}
          </div>
          <p className="text-[11px] text-slate-400">Completed shows &amp; blocks</p>
        </div>
      </div>

      {/* 2. Daily Interactive Slot Schedule Board */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-800 bg-[#111827]/85 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              Schedule for {formatTheaterDate(selectedDate)}
            </h2>
            <p className="text-xs text-slate-400">
              Click an available slot to book for an active resident or block for maintenance
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDate(initialDate)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                selectedDate === initialDate
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-slate-900 border-slate-700 text-slate-300"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(addDaysToDateKey(initialDate, 1))}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                selectedDate === addDaysToDateKey(initialDate, 1)
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-slate-900 border-slate-700 text-slate-300"
              }`}
            >
              Tomorrow
            </button>
            <div className="w-44">
              <DatePicker
                value={selectedDate}
                onChange={setSelectedDate}
                triggerClassName="p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs"
              />
            </div>
            {canEdit && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openBookModal("BLOCK", "MORNING", selectedDate)}
                  leftIcon={<Ban className="w-3.5 h-3.5" />}
                >
                  Block Slot
                </Button>
                <Button
                  variant="glow"
                  size="sm"
                  onClick={() => openBookModal("BOOK", "EVENING", selectedDate)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Book for Resident
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {THEATER_SLOTS.map((slot) => {
            const match = selectedDayBookings.find((b) => b.slotKey === slot.key);
            const isPastDate = selectedDate < initialDate;

            if (!match) {
              return (
                <div
                  key={slot.key}
                  className="p-4 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                        {slot.label}
                      </span>
                      <Badge variant="available" size="sm">
                        Open
                      </Badge>
                    </div>
                    <div className="text-sm font-black text-white">{slot.timeRange}</div>
                    <p className="text-[11px] text-slate-500">Free resident amenity slot</p>
                  </div>

                  {canEdit && !isPastDate && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="glow"
                        size="sm"
                        className="flex-1"
                        onClick={() => openBookModal("BOOK", slot.key, selectedDate)}
                      >
                        + Book
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openBookModal("BLOCK", slot.key, selectedDate)}
                        title="Block slot for maintenance or house event"
                      >
                        Block
                      </Button>
                    </div>
                  )}
                </div>
              );
            }

            const isBlocked = match.status === "BLOCKED";
            const isCompleted = match.status === "COMPLETED";

            return (
              <div
                key={slot.key}
                className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 ${
                  isBlocked
                    ? "border-amber-500/40 bg-amber-500/10"
                    : isCompleted
                    ? "border-cyan-500/30 bg-cyan-500/10"
                    : "border-indigo-500/40 bg-indigo-500/10"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                      {slot.label}
                    </span>
                    <Badge
                      variant={
                        isBlocked ? "warning" : isCompleted ? "indigo" : "available"
                      }
                      size="sm"
                    >
                      {isBlocked
                        ? "Blocked"
                        : isCompleted
                        ? "Completed"
                        : "Booked"}
                    </Badge>
                  </div>
                  <div className="text-sm font-black text-white">{slot.timeRange}</div>
                  <div className="text-xs font-bold text-indigo-200 truncate">
                    {match.title || "Movie / Screening"}
                  </div>
                  <div className="text-xs text-slate-200 font-semibold">
                    {match.residentName}
                    {match.roomBedLabel && (
                      <span className="block text-[11px] text-slate-400 font-normal">
                        {match.roomBedLabel}
                      </span>
                    )}
                  </div>
                  {!isBlocked && (
                    <div className="text-[11px] text-slate-300 flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {match.guestCount}
                      </span>
                      {match.residentPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {match.residentPhone}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="text-[10px] font-mono text-slate-400">
                    {match.bookingCode}
                  </div>
                </div>

                {canEdit && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {match.status === "BOOKED" && (
                      <>
                        <button
                          type="button"
                          disabled={busyId === match.id}
                          onClick={() => handleStatusChange(match, "COMPLETED")}
                          className="flex-1 px-2.5 py-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold hover:bg-emerald-600/30"
                        >
                          Done
                        </button>
                        <button
                          type="button"
                          disabled={busyId === match.id}
                          onClick={() => handleStatusChange(match, "CANCELLED")}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-bold hover:bg-rose-500/20"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {isBlocked && (
                      <button
                        type="button"
                        disabled={busyId === match.id}
                        onClick={() => handleStatusChange(match, "CANCELLED")}
                        className="flex-1 px-2.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-[11px] font-bold hover:bg-amber-500/30 flex items-center justify-center gap-1"
                      >
                        <Unlock className="w-3 h-3" /> Unblock Slot
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Bookings Log Table & Filters */}
      <div className="rounded-3xl border border-slate-800 bg-[#111827]/85 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white">
              All Home Theater Reservations ({filteredBookings.length})
            </h3>
            <p className="text-xs text-slate-400">
              Complete log of resident self-bookings, desk bookings, and blocked maintenance slots
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Resident, code, movie..."
                className="pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="w-40">
              <CustomSelect
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "BOOKED", label: "Booked" },
                  { value: "COMPLETED", label: "Completed" },
                  { value: "BLOCKED", label: "Blocked" },
                  { value: "CANCELLED", label: "Cancelled" },
                ]}
                triggerClassName="p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs"
              />
            </div>
          </div>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Film className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-300">No theater bookings found</p>
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-800">
              {paginatedBookings.map((row) => {
                const slot = getTheaterSlotMeta(row.slotKey);
                return (
                  <div key={row.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-indigo-400">
                            {row.bookingCode}
                          </span>
                          <Badge
                            variant={
                              row.status === "BOOKED"
                                ? "available"
                                : row.status === "COMPLETED"
                                ? "indigo"
                                : row.status === "BLOCKED"
                                ? "warning"
                                : "danger"
                            }
                            size="sm"
                          >
                            {row.status}
                          </Badge>
                        </div>
                        <div className="text-sm font-bold text-white mt-1">
                          {row.residentName}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {formatTheaterDate(row.slotDateKey)} · {slot.timeRange}
                        </div>
                        {row.title && (
                          <div className="text-xs text-indigo-300 mt-0.5">{row.title}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2 pt-1">
                      {canEdit && row.status === "BOOKED" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(row, "COMPLETED")}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold"
                          >
                            Mark Done
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(row, "CANCELLED")}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-bold"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(row)}
                          className="px-2.5 py-1 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-[11px] font-bold"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800 bg-slate-900/80 font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="p-3.5">Code &amp; Date</th>
                    <th className="p-3.5">Time Slot</th>
                    <th className="p-3.5">Resident</th>
                    <th className="p-3.5">Movie / Purpose</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {paginatedBookings.map((row) => {
                    const slot = getTheaterSlotMeta(row.slotKey);
                    return (
                      <tr key={row.id} className="hover:bg-slate-900/50">
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="font-mono font-bold text-indigo-400">
                            {row.bookingCode}
                          </div>
                          <div className="text-[11px] text-slate-300">
                            {formatTheaterDate(row.slotDateKey)}
                          </div>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="font-bold text-white">{slot.label}</div>
                          <div className="text-[11px] text-slate-400">{slot.timeRange}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-white">{row.residentName}</div>
                          <div className="text-[11px] text-slate-400">
                            {[row.roomBedLabel, row.residentPhone].filter(Boolean).join(" · ") ||
                              (row.bookedByRole === "ADMIN" ? "Booked by Admin" : "Resident")}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-200">
                            {row.title || "Movie / Screening"}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {row.status === "BLOCKED"
                              ? row.notes || "Management Hold"
                              : `${row.guestCount} ${row.guestCount === 1 ? "person" : "people"}${
                                  row.notes ? ` · ${row.notes}` : ""
                                }`}
                          </div>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <Badge
                            variant={
                              row.status === "BOOKED"
                                ? "available"
                                : row.status === "COMPLETED"
                                ? "indigo"
                                : row.status === "BLOCKED"
                                ? "warning"
                                : "danger"
                            }
                          >
                            {row.status}
                          </Badge>
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {canEdit && row.status === "BOOKED" && (
                              <>
                                <button
                                  type="button"
                                  disabled={busyId === row.id}
                                  onClick={() => handleStatusChange(row, "COMPLETED")}
                                  className="px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold hover:bg-emerald-500/25"
                                >
                                  Done
                                </button>
                                <button
                                  type="button"
                                  disabled={busyId === row.id}
                                  onClick={() => handleStatusChange(row, "CANCELLED")}
                                  className="px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-bold hover:bg-rose-500/20"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                            {canEdit && row.status === "BLOCKED" && (
                              <button
                                type="button"
                                disabled={busyId === row.id}
                                onClick={() => handleStatusChange(row, "CANCELLED")}
                                className="px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold hover:bg-amber-500/25"
                              >
                                Unblock
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                title="Delete record"
                                onClick={() => setDeleteTarget(row)}
                                className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
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
                totalItems={filteredBookings.length}
                pageSize={pageSize}
                onPageChange={setPage}
                itemLabel="theater bookings"
              />
            </div>
          </>
        )}
      </div>

      {/* Book / Block Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          modalAction === "BLOCK"
            ? "Block Home Theater Slot"
            : "Book Home Theater for Resident"
        }
        description="Free resident amenity reservation (₹0)."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveBooking} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 font-semibold flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Switch Mode */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setModalAction("BOOK")}
              className={`p-2.5 rounded-xl border text-xs font-bold transition ${
                modalAction === "BOOK"
                  ? "bg-indigo-600/20 border-indigo-500 text-white"
                  : "bg-slate-900 border-slate-700 text-slate-400"
              }`}
            >
              Book for Resident
            </button>
            <button
              type="button"
              onClick={() => setModalAction("BLOCK")}
              className={`p-2.5 rounded-xl border text-xs font-bold transition ${
                modalAction === "BLOCK"
                  ? "bg-amber-500/20 border-amber-500 text-amber-200"
                  : "bg-slate-900 border-slate-700 text-slate-400"
              }`}
            >
              Block Maintenance / Event
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Date *
              </label>
              <DatePicker
                value={formDate}
                min={initialDate}
                onChange={setFormDate}
                triggerClassName="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Time Slot *
              </label>
              <CustomSelect
                value={formSlotKey}
                onValueChange={setFormSlotKey}
                options={THEATER_SLOTS.map((s) => ({
                  value: s.key,
                  label: `${s.label} (${s.timeRange})`,
                }))}
                triggerClassName="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs"
              />
            </div>
          </div>

          {modalAction === "BOOK" && (
            <div className="space-y-3 p-3.5 rounded-2xl border border-slate-800 bg-slate-900/60">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-300">Resident Details</span>
                {activeResidents.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setResidentMode(residentMode === "SELECT" ? "MANUAL" : "SELECT")
                    }
                    className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300"
                  >
                    {residentMode === "SELECT"
                      ? "Enter Name Manually Instead"
                      : "Pick from Current Residents"}
                  </button>
                )}
              </div>

              {residentMode === "SELECT" && activeResidents.length > 0 ? (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Current Active Resident *
                  </label>
                  <CustomSelect
                    value={selectedResidentBookingId}
                    onValueChange={setSelectedResidentBookingId}
                    options={activeResidents.map((r) => ({
                      value: r.bookingId,
                      label: `${r.guestName} · ${r.roomBedLabel} (${r.guestPhone})`,
                    }))}
                    triggerClassName="p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Resident Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      placeholder="Full name"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Phone</label>
                    <input
                      type="text"
                      value={manualPhone}
                      onChange={(e) => setManualPhone(e.target.value)}
                      placeholder="10-digit phone"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Room / Bed</label>
                    <input
                      type="text"
                      value={manualRoomBed}
                      onChange={(e) => setManualRoomBed(e.target.value)}
                      placeholder="e.g., Room 114"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={modalAction === "BLOCK" ? "sm:col-span-3" : "sm:col-span-2"}>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {modalAction === "BLOCK"
                  ? "Reason / Event Title"
                  : "Movie / Screening Title (Optional)"}
              </label>
              <input
                type="text"
                maxLength={80}
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={
                  modalAction === "BLOCK"
                    ? "e.g., Projector Servicing / Hostel Movie Night"
                    : "e.g., IPL Match, Movie Screening"
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {modalAction === "BOOK" && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  People (1–20)
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={formGuestCount}
                  onChange={(e) =>
                    setFormGuestCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Optional instructions..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="glow" isLoading={saving}>
              {modalAction === "BLOCK" ? "Confirm Block" : "Confirm Free Booking"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Theater Record?"
        maxWidth="md"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/10">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-200">
                Delete booking <strong>{deleteTarget.bookingCode}</strong> ({deleteTarget.residentName}) for{" "}
                {formatTheaterDate(deleteTarget.slotDateKey)}?
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
                onClick={handleDeleteConfirm}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
