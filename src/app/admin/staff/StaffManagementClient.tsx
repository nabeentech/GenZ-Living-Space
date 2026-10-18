"use client";

import React, { useState, useMemo } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import {
  ShieldCheck,
  UserPlus,
  Search,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Lock,
  Unlock,
  Trash2,
  Edit,
  Power,
  Users,
  Layers,
  Sparkles,
  HelpCircle,
  RefreshCw,
  Settings,
  DollarSign,
  Ban,
  Check,
} from "lucide-react";
import {
  ADMIN_MODULES,
  PERMISSION_PRESETS,
  DEFAULT_ROLE_PERMISSIONS,
  UserPermissions,
  parsePermissions,
} from "@/lib/permissions";

export interface StaffItem {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  active: boolean;
  permissions?: string | null;
  parsedPermissions: UserPermissions;
  createdAt: string;
  updatedAt: string;
}

interface StaffManagementClientProps {
  initialStaff: StaffItem[];
  currentUserId: string;
}

const AVAILABLE_ROLES = [
  { value: "SUPER_ADMIN", label: "Super Administrator", badgeVariant: "indigo" as const },
  { value: "PROPERTY_MANAGER", label: "Property Manager", badgeVariant: "coral" as const },
  { value: "RECEPTIONIST", label: "Receptionist / Front Desk", badgeVariant: "cyan" as const },
  { value: "FINANCE", label: "Finance & Accounts", badgeVariant: "success" as const },
  { value: "HOUSEKEEPING", label: "Housekeeping", badgeVariant: "warning" as const },
  { value: "SUPPORT_STAFF", label: "Support & Guest Relations", badgeVariant: "default" as const },
];

export default function StaffManagementClient({
  initialStaff,
  currentUserId,
}: StaffManagementClientProps) {
  const [staffList, setStaffList] = useState<StaffItem[]>(initialStaff);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Notifications
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffItem | null>(null);

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Form state
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "PROPERTY_MANAGER",
    customPermissions: { ...DEFAULT_ROLE_PERMISSIONS.PROPERTY_MANAGER },
  });

  // Edit Form state
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    role: "PROPERTY_MANAGER",
    password: "",
  });

  // Granular Permissions Modal state
  const [editPerms, setEditPerms] = useState<UserPermissions>({
    allowedModules: [],
    canEdit: true,
    canDelete: false,
    hideFinancialAmounts: false,
  });

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.phone && s.phone.includes(searchQuery));
      const matchesRole = roleFilter === "ALL" || s.role === roleFilter;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && s.active) ||
        (statusFilter === "INACTIVE" && !s.active);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [staffList, searchQuery, roleFilter, statusFilter]);

  // Summary counts
  const stats = useMemo(() => {
    const total = staffList.length;
    const active = staffList.filter((s) => s.active).length;
    const managers = staffList.filter((s) => s.role === "PROPERTY_MANAGER").length;
    const reception = staffList.filter((s) => s.role === "RECEPTIONIST").length;
    const maskedFinancials = staffList.filter(
      (s) => s.parsedPermissions.hideFinancialAmounts
    ).length;
    return { total, active, managers, reception, maskedFinancials };
  }, [staffList]);

  // Open Permissions Modal
  const handleOpenPermissions = (staff: StaffItem) => {
    setSelectedStaff(staff);
    setEditPerms({ ...staff.parsedPermissions });
    setIsPermModalOpen(true);
  };

  // Open Edit Profile Modal
  const handleOpenEdit = (staff: StaffItem) => {
    setSelectedStaff(staff);
    setEditForm({
      name: staff.name,
      phone: staff.phone || "",
      role: staff.role,
      password: "",
    });
    setIsEditModalOpen(true);
  };

  // Handle Role selection in Add Form
  const handleAddRoleChange = (newRole: string) => {
    const defaultPerms = DEFAULT_ROLE_PERMISSIONS[newRole] || {
      allowedModules: [],
      canEdit: true,
      canDelete: false,
      hideFinancialAmounts: false,
    };
    setAddForm((prev) => ({
      ...prev,
      role: newRole,
      customPermissions: { ...defaultPerms },
    }));
  };

  // Submit Add Staff
  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name || !addForm.email || !addForm.password) {
      showToast("error", "Name, email, and password are required.");
      return;
    }
    if (addForm.password.length < 6) {
      showToast("error", "Password must be at least 6 characters.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.name,
          email: addForm.email,
          password: addForm.password,
          phone: addForm.phone,
          role: addForm.role,
          permissions: addForm.customPermissions,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast("error", data.message || "Failed to create staff account.");
        return;
      }

      setStaffList((prev) => [data.staff, ...prev]);
      showToast("success", `Created staff account for ${data.staff.name}`);
      setIsAddModalOpen(false);
      setAddForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        role: "PROPERTY_MANAGER",
        customPermissions: { ...DEFAULT_ROLE_PERMISSIONS.PROPERTY_MANAGER },
      });
    } catch {
      showToast("error", "Network error creating staff member.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Staff
  const handleEditStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    try {
      setIsSubmitting(true);
      const payload: {
        name: string;
        phone?: string;
        role: string;
        password?: string;
      } = {
        name: editForm.name,
        phone: editForm.phone,
        role: editForm.role,
      };

      if (editForm.password.trim()) {
        if (editForm.password.trim().length < 6) {
          showToast("error", "New password must be at least 6 characters.");
          setIsSubmitting(false);
          return;
        }
        payload.password = editForm.password.trim();
      }

      const res = await fetch(`/api/admin/staff/${selectedStaff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast("error", data.message || "Failed to update staff.");
        return;
      }

      setStaffList((prev) =>
        prev.map((s) => (s.id === selectedStaff.id ? data.staff : s))
      );
      showToast("success", `Updated staff account for ${data.staff.name}`);
      setIsEditModalOpen(false);
    } catch {
      showToast("error", "Network error updating staff member.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Granular Permissions Matrix
  const handleSavePermissions = async () => {
    if (!selectedStaff) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/admin/staff/${selectedStaff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permissions: editPerms,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast("error", data.message || "Failed to update permissions.");
        return;
      }

      setStaffList((prev) =>
        prev.map((s) => (s.id === selectedStaff.id ? data.staff : s))
      );
      showToast("success", `Saved custom permissions for ${data.staff.name}`);
      setIsPermModalOpen(false);
    } catch {
      showToast("error", "Network error saving permissions.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Staff Active / Suspended
  const handleToggleActive = async (staff: StaffItem) => {
    if (staff.id === currentUserId) {
      showToast("error", "You cannot deactivate your own Super Admin account.");
      return;
    }

    try {
      const newStatus = !staff.active;
      const res = await fetch(`/api/admin/staff/${staff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: newStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast("error", data.message || "Failed to change account status.");
        return;
      }

      setStaffList((prev) =>
        prev.map((s) => (s.id === staff.id ? { ...s, active: newStatus } : s))
      );
      showToast(
        "success",
        `${staff.name} is now ${newStatus ? "Activated" : "Suspended"}`
      );
    } catch {
      showToast("error", "Error toggling account status.");
    }
  };

  // Delete Staff Member
  const handleDeleteStaff = async () => {
    if (!selectedStaff) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/admin/staff/${selectedStaff.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast("error", data.message || "Failed to delete staff member.");
        return;
      }

      setStaffList((prev) => prev.filter((s) => s.id !== selectedStaff.id));
      showToast("success", data.message || "Staff member removed.");
      setIsDeleteModalOpen(false);
    } catch {
      showToast("error", "Error deleting staff member.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Module toggle inside Permissions Modal
  const toggleModule = (moduleKey: string) => {
    setEditPerms((prev) => {
      const current = prev.allowedModules || [];
      const updated = current.includes(moduleKey)
        ? current.filter((k) => k !== moduleKey)
        : [...current, moduleKey];
      return { ...prev, allowedModules: updated };
    });
  };

  // Apply a Preset in Permissions Modal
  const applyPreset = (presetPerms: UserPermissions) => {
    setEditPerms({ ...presetPerms });
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${
            toast.type === "success"
              ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-200"
              : "bg-rose-500/20 border border-rose-500/40 text-rose-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 shadow-glow shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Staff &amp; Access Control
                </h1>
                <Badge variant="indigo" size="sm">
                  Super Admin
                </Badge>
              </div>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Create employee logins, assign operational roles, configure modular
            sidebar access, and toggle view-only or financial masking overrides.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsAddModalOpen(true)}
          className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 shadow-glow py-2.5"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Staff Member</span>
        </Button>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-2xl bg-[#0F1422] border border-slate-800/80 shadow-card">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-[11px] sm:text-xs text-slate-400 font-semibold">Total Staff</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">{stats.total}</div>
          <span className="text-[10px] text-slate-500 hidden sm:block">Across all operational tiers</span>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-[#0F1422] border border-slate-800/80 shadow-card">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-[11px] sm:text-xs text-slate-400 font-semibold">Active Logins</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400">{stats.active}</div>
          <span className="text-[10px] text-slate-500 hidden sm:block">Active credentials</span>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-[#0F1422] border border-slate-800/80 shadow-card">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-[11px] sm:text-xs text-slate-400 font-semibold">Managers</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">{stats.managers}</div>
          <span className="text-[10px] text-slate-500 hidden sm:block">Supervisors</span>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-[#0F1422] border border-slate-800/80 shadow-card">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-[11px] sm:text-xs text-slate-400 font-semibold">Receptionists</span>
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">{stats.reception}</div>
          <span className="text-[10px] text-slate-500 hidden sm:block">Front desk operations</span>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-[#0F1422] border border-slate-800/80 shadow-card col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-[11px] sm:text-xs text-slate-400 font-semibold">Masked Financials</span>
            <EyeOff className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-400">{stats.maskedFinancials}</div>
          <span className="text-[10px] text-slate-500">Prices &amp; revenues hidden</span>
        </div>
      </div>

      {/* Filters and Search Toolbar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0F1422] border border-slate-800/80 shadow-card space-y-3 md:space-y-0 md:flex md:items-center md:justify-between md:gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="Filter staff by role"
            className="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Roles</option>
            {AVAILABLE_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter staff by status"
            className="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Suspended Only</option>
          </select>

          {(searchQuery || roleFilter !== "ALL" || statusFilter !== "ALL") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setRoleFilter("ALL");
                setStatusFilter("ALL");
              }}
              className="col-span-2 sm:col-span-1 text-xs text-indigo-400 hover:text-indigo-300 py-1 text-center font-semibold"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ================= MOBILE STAFF CARDS (Screen width < md) ================= */}
      <div className="md:hidden space-y-3">
        {filteredStaff.length === 0 ? (
          <div className="p-8 text-center text-slate-500 rounded-2xl bg-[#0F1422] border border-slate-800/80">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="font-semibold text-sm">No staff accounts found</p>
            <p className="text-xs text-slate-600 mt-1">Try adjusting your search query or filters.</p>
          </div>
        ) : (
          filteredStaff.map((staff) => {
            const roleObj = AVAILABLE_ROLES.find((r) => r.value === staff.role) || {
              label: staff.role,
              badgeVariant: "default" as const,
            };
            const perms = staff.parsedPermissions;
            const isCurrent = staff.id === currentUserId;

            return (
              <div
                key={staff.id}
                className="p-4 rounded-2xl bg-[#0F1422] border border-slate-800/80 shadow-card space-y-3.5"
              >
                {/* Header: Avatar, Name, Email, Status */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-900/70 to-purple-900/70 border border-indigo-700/40 flex items-center justify-center font-bold text-sm text-indigo-300 shrink-0 shadow-sm">
                      {staff.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-white text-sm truncate">
                          {staff.name}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono font-medium">
                            You
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 block truncate">
                        {staff.email}
                      </span>
                      {staff.phone && (
                        <span className="text-[11px] text-slate-500 block">
                          {staff.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="shrink-0">
                    {staff.active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        Suspended
                      </span>
                    )}
                  </div>
                </div>

                {/* Role & Permissions Snapshot */}
                <div className="pt-2.5 border-t border-slate-800/60 flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant={roleObj.badgeVariant}
                    size="sm"
                    className="font-medium text-[11px]"
                  >
                    {roleObj.label}
                  </Badge>

                  {/* Module Count */}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-[10px] text-slate-300 font-mono">
                    <Layers className="w-3 h-3 text-indigo-400" />
                    {staff.role === "SUPER_ADMIN"
                      ? "All 20 Modules"
                      : `${perms.allowedModules.length} Modules`}
                  </span>

                  {/* Edit / View Mode */}
                  {perms.canEdit ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300 font-medium">
                      <Check className="w-3 h-3" /> Full Edit
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 font-medium">
                      <Lock className="w-3 h-3" /> View Only
                    </span>
                  )}

                  {/* Financial Masking */}
                  {perms.hideFinancialAmounts ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-[10px] text-rose-300 font-medium">
                      <EyeOff className="w-3 h-3" /> Financials Masked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700 text-[10px] text-slate-400">
                      <DollarSign className="w-3 h-3 text-slate-500" /> Amounts Visible
                    </span>
                  )}
                </div>

                {/* Touch-Friendly Action Buttons */}
                <div className="pt-2.5 border-t border-slate-800/60 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenPermissions(staff)}
                      className="py-2.5 px-3 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                    >
                      <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Permissions</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(staff)}
                      className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                    >
                      <Edit className="w-3.5 h-3.5 text-slate-300" />
                      <span>Edit &amp; Reset</span>
                    </button>
                  </div>

                  {!isCurrent && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(staff)}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.98] ${
                          staff.active
                            ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20"
                            : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{staff.active ? "Suspend" : "Activate"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStaff(staff);
                          setIsDeleteModalOpen(true);
                        }}
                        className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ================= DESKTOP TABLE VIEW (Screen width >= md) ================= */}
      <div className="hidden md:block rounded-2xl bg-[#0F1422] border border-slate-800/80 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-900/50 text-slate-400 font-semibold tracking-wider uppercase text-[10px]">
                <th className="py-3.5 px-4">Staff Member</th>
                <th className="py-3.5 px-4">Role Tier</th>
                <th className="py-3.5 px-4">Access &amp; Permissions</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-semibold text-sm">No staff accounts found</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Try adjusting your search query or filters.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const roleObj = AVAILABLE_ROLES.find((r) => r.value === staff.role) || {
                    label: staff.role,
                    badgeVariant: "default" as const,
                  };
                  const perms = staff.parsedPermissions;
                  const isCurrent = staff.id === currentUserId;

                  return (
                    <tr
                      key={staff.id}
                      className="hover:bg-slate-900/40 transition-colors"
                    >
                      {/* Name & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-900/70 to-purple-900/70 border border-indigo-700/40 flex items-center justify-center font-bold text-sm text-indigo-300 shrink-0">
                            {staff.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-xs truncate">
                                {staff.name}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono font-medium">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 block truncate">
                              {staff.email}
                            </span>
                            {staff.phone && (
                              <span className="text-[10px] text-slate-500 block">
                                {staff.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={roleObj.badgeVariant}
                          size="sm"
                          className="font-medium text-[11px]"
                        >
                          {roleObj.label}
                        </Badge>
                      </td>

                      {/* Permissions Snapshot */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1.5 max-w-sm">
                          {/* Module Count */}
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-[10px] text-slate-300 font-mono">
                            <Layers className="w-3 h-3 text-indigo-400" />
                            {staff.role === "SUPER_ADMIN"
                              ? "All 20 Modules"
                              : `${perms.allowedModules.length} Modules`}
                          </span>

                          {/* Edit / View Mode */}
                          {perms.canEdit ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300 font-medium">
                              <Check className="w-3 h-3" /> Full Edit
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 font-medium">
                              <Lock className="w-3 h-3" /> View Only
                            </span>
                          )}

                          {/* Financial Masking */}
                          {perms.hideFinancialAmounts ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-[10px] text-rose-300 font-medium">
                              <EyeOff className="w-3 h-3" /> Financials Masked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700 text-[10px] text-slate-400">
                              <DollarSign className="w-3 h-3 text-slate-500" /> Amounts Visible
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {staff.active ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-xs text-emerald-400 font-semibold">Active</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-400" />
                            <span className="text-xs text-rose-400 font-semibold">Suspended</span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Granular Permissions Button */}
                          <button
                            onClick={() => handleOpenPermissions(staff)}
                            title="Configure Granular Permissions Matrix"
                            className="p-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/40 transition"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Profile & Password Button */}
                          <button
                            onClick={() => handleOpenEdit(staff)}
                            title="Edit Account & Reset Password"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active / Suspended */}
                          {!isCurrent && (
                            <button
                              onClick={() => handleToggleActive(staff)}
                              title={staff.active ? "Suspend Account" : "Activate Account"}
                              className={`p-1.5 rounded-lg border transition ${
                                staff.active
                                  ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20"
                                  : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Account */}
                          {!isCurrent && (
                            <button
                              onClick={() => {
                                setSelectedStaff(staff);
                                setIsDeleteModalOpen(true);
                              }}
                              title="Delete or Deactivate Staff"
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL: ADD STAFF MEMBER ================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !isSubmitting && setIsAddModalOpen(false)}
        title="Add New Staff Member"
        description="Create credentials and assign initial operational permissions for the new staff member."
        maxWidth="lg"
      >
        <form onSubmit={handleAddStaffSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Work Email *
              </label>
              <input
                type="email"
                required
                placeholder="e.g. rahul@genzliving.com"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Password * (min 6 chars)
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={addForm.password}
                onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Phone Number (Optional)
              </label>
              <input
                type="text"
                placeholder="+91 9876543210"
                value={addForm.phone}
                onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Role &amp; Primary Tier *
            </label>
            <select
              value={addForm.role}
              onChange={(e) => handleAddRoleChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {AVAILABLE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Selecting a role auto-fills the recommended operational permissions. You can also customize them below.
            </p>
          </div>

          {/* Quick Permission Preview / Overrides for Add Form */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">
                Initial Access Safeguards
              </span>
              <span className="text-[10px] text-indigo-400 font-mono">
                {addForm.customPermissions.allowedModules.length} Modules Pre-Selected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addForm.customPermissions.canEdit}
                  onChange={(e) =>
                    setAddForm((prev) => ({
                      ...prev,
                      customPermissions: {
                        ...prev.customPermissions,
                        canEdit: e.target.checked,
                      },
                    }))
                  }
                  className="rounded text-indigo-600 focus:ring-0"
                />
                <span className="text-slate-300 font-medium">
                  Can Edit Operational Data
                </span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addForm.customPermissions.hideFinancialAmounts}
                  onChange={(e) =>
                    setAddForm((prev) => ({
                      ...prev,
                      customPermissions: {
                        ...prev.customPermissions,
                        hideFinancialAmounts: e.target.checked,
                      },
                    }))
                  }
                  className="rounded text-rose-500 focus:ring-0"
                />
                <span className="text-rose-300 font-medium">
                  Mask Prices &amp; Financial Figures
                </span>
              </label>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={isSubmitting}
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="w-full sm:w-auto" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Staff Account"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: EDIT PROFILE & PASSWORD ================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => !isSubmitting && setIsEditModalOpen(false)}
        title={`Edit Account: ${selectedStaff?.name || ""}`}
        description="Update profile details, assign a different role tier, or reset password."
        maxWidth="md"
      >
        <form onSubmit={handleEditStaffSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Phone Number
            </label>
            <input
              type="text"
              placeholder="+91 9876543210"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Role Tier
            </label>
            <select
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              disabled={selectedStaff?.id === currentUserId}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            >
              {AVAILABLE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            {selectedStaff?.id === currentUserId && (
              <span className="text-[10px] text-indigo-400 mt-1 block">
                You cannot modify your own Super Admin role tier.
              </span>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>Reset Password (Optional)</span>
            </div>
            <input
              type="password"
              placeholder="Leave blank to keep existing password"
              value={editForm.password}
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <span className="text-[10px] text-slate-500 block">
              Enter 6+ characters only if you want to reset this user&apos;s password.
            </span>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={isSubmitting}
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="w-full sm:w-auto" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: GRANULAR PERMISSIONS MATRIX ================= */}
      <Modal
        isOpen={isPermModalOpen}
        onClose={() => !isSubmitting && setIsPermModalOpen(false)}
        title={`Permissions & Access Matrix: ${selectedStaff?.name || ""}`}
        description="Fine-tune which individual modules this user can view, and whether they can edit data or see financial figures."
        maxWidth="2xl"
      >
        <div className="space-y-5 pt-1">
          {/* Preset Buttons */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300">
                Apply Recommended Preset
              </span>
              <span className="text-[10px] text-slate-500">
                Clicking a preset instantly configures module and safety toggles
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PERMISSION_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.permissions)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 text-[11px] text-slate-300 hover:text-white transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Master Safeguard Toggles (canEdit, hideFinancialAmounts, canDelete) */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900/90 to-slate-900/40 border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-white block">
              Core Security &amp; Operational Controls
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Can Edit Switch */}
              <div
                onClick={() =>
                  setEditPerms((prev) => ({ ...prev, canEdit: !prev.canEdit }))
                }
                className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  editPerms.canEdit
                    ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-200"
                    : "bg-amber-950/20 border-amber-500/30 text-amber-200"
                }`}
              >
                <div className="mt-0.5">
                  {editPerms.canEdit ? (
                    <Unlock className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Lock className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <div>
                  <span className="text-xs font-bold block">
                    {editPerms.canEdit ? "Edit Allowed" : "View-Only Mode"}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">
                    {editPerms.canEdit
                      ? "User can modify beds, rooms, bookings & check-ins"
                      : "User can see data, but cannot edit or change anything"}
                  </span>
                </div>
              </div>

              {/* Hide Financial Amounts Switch */}
              <div
                onClick={() =>
                  setEditPerms((prev) => ({
                    ...prev,
                    hideFinancialAmounts: !prev.hideFinancialAmounts,
                  }))
                }
                className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  editPerms.hideFinancialAmounts
                    ? "bg-rose-950/30 border-rose-500/50 text-rose-200"
                    : "bg-slate-950/50 border-slate-800 text-slate-300"
                }`}
              >
                <div className="mt-0.5">
                  {editPerms.hideFinancialAmounts ? (
                    <EyeOff className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div>
                  <span className="text-xs font-bold block">
                    {editPerms.hideFinancialAmounts
                      ? "Financials Masked"
                      : "Financials Visible"}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">
                    {editPerms.hideFinancialAmounts
                      ? "Prices, revenue & booking amounts masked as ••••••"
                      : "User can see monetary amounts and collections"}
                  </span>
                </div>
              </div>

              {/* Can Delete Switch */}
              <div
                onClick={() =>
                  setEditPerms((prev) => ({ ...prev, canDelete: !prev.canDelete }))
                }
                className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  editPerms.canDelete
                    ? "bg-indigo-950/20 border-indigo-500/40 text-indigo-200"
                    : "bg-slate-950/50 border-slate-800 text-slate-400"
                }`}
              >
                <div className="mt-0.5">
                  <Trash2
                    className={`w-4 h-4 ${
                      editPerms.canDelete ? "text-indigo-400" : "text-slate-500"
                    }`}
                  />
                </div>
                <div>
                  <span className="text-xs font-bold block">
                    {editPerms.canDelete ? "Can Delete Records" : "Deletion Forbidden"}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5 leading-tight">
                    {editPerms.canDelete
                      ? "Can delete bookings, complaints, or items"
                      : "Delete actions are hidden & rejected"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Module Access Checkboxes */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">
                  Permitted Navigation Modules
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 font-mono font-bold">
                  {editPerms.allowedModules.length} / {ADMIN_MODULES.length} Active
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() =>
                    setEditPerms((prev) => ({
                      ...prev,
                      allowedModules: ADMIN_MODULES.map((m) => m.key),
                    }))
                  }
                  className="text-indigo-400 hover:text-indigo-300"
                >
                  Select All
                </button>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={() =>
                    setEditPerms((prev) => ({ ...prev, allowedModules: [] }))
                  }
                  className="text-slate-400 hover:text-slate-300"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {ADMIN_MODULES.map((mod) => {
                const isChecked = editPerms.allowedModules.includes(mod.key);
                return (
                  <div
                    key={mod.key}
                    onClick={() => toggleModule(mod.key)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                      isChecked
                        ? "bg-indigo-950/20 border-indigo-500/40"
                        : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // Handled by container onClick
                      className="mt-0.5 rounded text-indigo-600 focus:ring-0"
                    />
                    <div className="min-w-0">
                      <span
                        className={`text-xs font-bold block truncate ${
                          isChecked ? "text-white" : "text-slate-400"
                        }`}
                      >
                        {mod.label}
                      </span>
                      <span className="text-[10px] text-slate-500 block leading-tight mt-0.5 line-clamp-1">
                        {mod.description}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <span className="text-[11px] text-slate-500">
              Changes take effect immediately on next page refresh or navigation.
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={isSubmitting}
                onClick={() => setIsPermModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                className="w-full sm:w-auto"
                disabled={isSubmitting}
                onClick={handleSavePermissions}
              >
                {isSubmitting ? "Saving..." : "Save Permissions"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: DELETE CONFIRMATION ================= */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !isSubmitting && setIsDeleteModalOpen(false)}
        title="Delete Staff Member"
        description="Are you sure you want to remove this staff account?"
        maxWidth="sm"
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>
              If this staff member has created bookings, assigned housekeeping tasks, or handled guest tickets, their account will be safely deactivated to preserve historical audit logs.
            </span>
          </div>

          <p className="text-xs text-slate-300">
            Staff Member: <strong className="text-white">{selectedStaff?.name}</strong> ({selectedStaff?.email})
          </p>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={isSubmitting}
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              className="w-full sm:w-auto"
              disabled={isSubmitting}
              onClick={handleDeleteStaff}
            >
              {isSubmitting ? "Processing..." : "Confirm Delete / Deactivate"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
