export interface UserPermissions {
  allowedModules: string[];
  canEdit: boolean;
  canDelete: boolean;
  hideFinancialAmounts: boolean;
}

export interface AdminModuleDef {
  key: string;
  label: string;
  href: string;
  description: string;
  category: "operations" | "management" | "finance" | "system";
}

export const ADMIN_MODULES: AdminModuleDef[] = [
  {
    key: "dashboard",
    label: "Dashboard Overview",
    href: "/admin",
    description: "Operational high-level dashboard and metrics",
    category: "management",
  },
  {
    key: "reception",
    label: "Reception Desk",
    href: "/admin/receptionist",
    description: "Daily guest arrivals, departures, and key operations",
    category: "operations",
  },
  {
    key: "manager",
    label: "Manager Operations",
    href: "/admin/manager",
    description: "Operational management and property control panel",
    category: "management",
  },
  {
    key: "beds",
    label: "Visual Bed Matrix",
    href: "/admin/beds",
    description: "Floor and bed-level real-time occupancy grid",
    category: "operations",
  },
  {
    key: "rooms",
    label: "Room Management",
    href: "/admin/rooms",
    description: "Rooms, room categories, bed layouts and maintenance",
    category: "operations",
  },
  {
    key: "pricing",
    label: "Pricing Management",
    href: "/admin/pricing",
    description: "Room rates, dynamic pricing rules, and deposit terms",
    category: "finance",
  },
  {
    key: "checkin",
    label: "Check-In / Out QR Desk",
    href: "/admin/checkin",
    description: "Digital guest check-ins, QR scan validation, ID verification",
    category: "operations",
  },
  {
    key: "walkin",
    label: "Walk-In Reservation",
    href: "/admin/walkin",
    description: "Immediate front-desk guest bookings and instant allotment",
    category: "operations",
  },
  {
    key: "bookings",
    label: "Bookings Management",
    href: "/admin/bookings",
    description: "Complete list of reservations, guest details, and stay status",
    category: "operations",
  },
  {
    key: "extensions",
    label: "Stay Extensions",
    href: "/admin/extensions",
    description: "Monthly and daily stay extension approvals and requests",
    category: "operations",
  },
  {
    key: "customers",
    label: "Customers Directory",
    href: "/admin/customers",
    description: "Guest directory, stay records, and communication contacts",
    category: "operations",
  },
  {
    key: "housekeeping",
    label: "Housekeeping & Clean",
    href: "/admin/housekeeping",
    description: "Room cleaning status, task assignments, and inspection logs",
    category: "operations",
  },
  {
    key: "complaints",
    label: "Complaints & Support",
    href: "/admin/complaints",
    description: "Guest tickets, maintenance requests, and issue resolution",
    category: "operations",
  },
  {
    key: "coupons",
    label: "Coupons & Promos",
    href: "/admin/coupons",
    description: "Promotional discount codes and marketing vouchers",
    category: "finance",
  },
  {
    key: "payments",
    label: "Payments & Invoices",
    href: "/admin/payments",
    description: "Transaction records, automated tax invoices, and receipts",
    category: "finance",
  },
  {
    key: "reports",
    label: "Reports & Analytics",
    href: "/admin/reports",
    description: "Revenue charts, occupancy percentages, and financial breakdowns",
    category: "finance",
  },
  {
    key: "gallery",
    label: "Gallery Management",
    href: "/admin/gallery",
    description: "Hostel photos upload and public gallery ordering",
    category: "management",
  },
  {
    key: "cms",
    label: "Website CMS",
    href: "/admin/cms",
    description: "Marketing banners, testimonials, amenities text, and FAQs",
    category: "system",
  },
  {
    key: "auditLogs",
    label: "Audit Logs",
    href: "/admin/audit-logs",
    description: "Security trail of all administrative actions and logins",
    category: "system",
  },
  {
    key: "staff",
    label: "Staff & Access Control",
    href: "/admin/staff",
    description: "Create staff logins, assign roles, and customize permissions",
    category: "system",
  },
  {
    key: "database",
    label: "Database Studio (ORM)",
    href: "/admin/database",
    description: "Dev ORM database table explorer, record manager, and test data cleanup",
    category: "system",
  },
];

export const ALL_MODULE_KEYS = ADMIN_MODULES.map((m) => m.key);

export const DEFAULT_ROLE_PERMISSIONS: Record<string, UserPermissions> = {
  SUPER_ADMIN: {
    allowedModules: ALL_MODULE_KEYS,
    canEdit: true,
    canDelete: true,
    hideFinancialAmounts: false,
  },
  PROPERTY_MANAGER: {
    allowedModules: [
      "dashboard",
      "manager",
      "beds",
      "rooms",
      "pricing",
      "checkin",
      "walkin",
      "bookings",
      "extensions",
      "customers",
      "housekeeping",
      "complaints",
      "gallery",
    ],
    canEdit: true,
    canDelete: false,
    hideFinancialAmounts: false,
  },
  RECEPTIONIST: {
    allowedModules: [
      "reception",
      "checkin",
      "walkin",
      "bookings",
      "rooms",
      "beds",
      "complaints",
    ],
    canEdit: true,
    canDelete: false,
    hideFinancialAmounts: false,
  },
  FINANCE: {
    allowedModules: [
      "dashboard",
      "pricing",
      "payments",
      "reports",
      "extensions",
      "bookings",
    ],
    canEdit: true,
    canDelete: false,
    hideFinancialAmounts: false,
  },
  HOUSEKEEPING: {
    allowedModules: ["dashboard", "housekeeping", "rooms"],
    canEdit: true,
    canDelete: false,
    hideFinancialAmounts: true,
  },
  SUPPORT_STAFF: {
    allowedModules: ["dashboard", "complaints", "bookings", "customers"],
    canEdit: true,
    canDelete: false,
    hideFinancialAmounts: true,
  },
  CUSTOMER: {
    allowedModules: [],
    canEdit: false,
    canDelete: false,
    hideFinancialAmounts: false,
  },
};

/**
 * Pre-configured presets for quick assignment in UI
 */
export const PERMISSION_PRESETS: {
  id: string;
  name: string;
  role: string;
  description: string;
  permissions: UserPermissions;
}[] = [
  {
    id: "super_admin",
    name: "Full Super Admin",
    role: "SUPER_ADMIN",
    description: "Full, unrestricted access to all modules, financial figures, and user administration.",
    permissions: DEFAULT_ROLE_PERMISSIONS.SUPER_ADMIN,
  },
  {
    id: "manager_full",
    name: "Property Manager (Full Operations)",
    role: "PROPERTY_MANAGER",
    description: "Manage rooms, bed allocation, check-ins, pricing, and guest complaints.",
    permissions: DEFAULT_ROLE_PERMISSIONS.PROPERTY_MANAGER,
  },
  {
    id: "manager_view_only",
    name: "Operations Auditor / Manager (View-Only)",
    role: "PROPERTY_MANAGER",
    description: "Can view all property operations and bookings, but cannot modify or change records.",
    permissions: {
      ...DEFAULT_ROLE_PERMISSIONS.PROPERTY_MANAGER,
      canEdit: false,
      canDelete: false,
      hideFinancialAmounts: false,
    },
  },
  {
    id: "reception_desk",
    name: "Front Desk & Receptionist",
    role: "RECEPTIONIST",
    description: "Manage daily check-ins, walk-ins, bed allocation, and guest lookup.",
    permissions: DEFAULT_ROLE_PERMISSIONS.RECEPTIONIST,
  },
  {
    id: "supervisor_no_financials",
    name: "Floor Supervisor (No Financials)",
    role: "PROPERTY_MANAGER",
    description: "Inspect beds, rooms, check-in statuses, and housekeeping; all price and monetary figures are masked.",
    permissions: {
      allowedModules: ["beds", "rooms", "bookings", "housekeeping", "complaints", "checkin"],
      canEdit: false,
      canDelete: false,
      hideFinancialAmounts: true,
    },
  },
  {
    id: "finance_officer",
    name: "Finance & Accounts Officer",
    role: "FINANCE",
    description: "Access to payments, invoices, dynamic pricing, and financial analytics.",
    permissions: DEFAULT_ROLE_PERMISSIONS.FINANCE,
  },
  {
    id: "housekeeping_crew",
    name: "Housekeeping & Facilities",
    role: "HOUSEKEEPING",
    description: "Manage cleaning queues, room inspection, and maintenance with financials hidden.",
    permissions: DEFAULT_ROLE_PERMISSIONS.HOUSEKEEPING,
  },
];

export function parsePermissions(
  rawJson: string | null | undefined,
  role?: string
): UserPermissions {
  const fallback = (role && DEFAULT_ROLE_PERMISSIONS[role]) || {
    allowedModules: [],
    canEdit: false,
    canDelete: false,
    hideFinancialAmounts: false,
  };

  if (role === "SUPER_ADMIN") {
    return {
      allowedModules: ALL_MODULE_KEYS,
      canEdit: true,
      canDelete: true,
      hideFinancialAmounts: false,
    };
  }

  if (!rawJson || rawJson.trim() === "" || rawJson.trim() === "{}") {
    return fallback;
  }

  try {
    const parsed = JSON.parse(rawJson);
    return {
      allowedModules: Array.isArray(parsed.allowedModules)
        ? parsed.allowedModules
        : fallback.allowedModules,
      canEdit: typeof parsed.canEdit === "boolean" ? parsed.canEdit : fallback.canEdit,
      canDelete: typeof parsed.canDelete === "boolean" ? parsed.canDelete : fallback.canDelete,
      hideFinancialAmounts:
        typeof parsed.hideFinancialAmounts === "boolean"
          ? parsed.hideFinancialAmounts
          : fallback.hideFinancialAmounts,
    };
  } catch {
    return fallback;
  }
}

export function getUserPermissions(user: {
  role: string;
  permissions?: string | null;
} | null | undefined): UserPermissions {
  if (!user) {
    return {
      allowedModules: [],
      canEdit: false,
      canDelete: false,
      hideFinancialAmounts: false,
    };
  }
  return parsePermissions(user.permissions, user.role);
}

export function canAccessModule(
  user: { role: string; permissions?: string | null } | null | undefined,
  moduleKeyOrHref: string
): boolean {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;

  const perms = getUserPermissions(user);

  // Check by key directly
  if (perms.allowedModules.includes(moduleKeyOrHref)) {
    return true;
  }

  // Check by matching href
  const mod = ADMIN_MODULES.find(
    (m) => m.href === moduleKeyOrHref || m.key === moduleKeyOrHref
  );
  if (mod) {
    return perms.allowedModules.includes(mod.key);
  }

  return false;
}

export function canUserEdit(
  user: { role: string; permissions?: string | null } | null | undefined
): boolean {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;
  const perms = getUserPermissions(user);
  return perms.canEdit;
}

export function canUserDelete(
  user: { role: string; permissions?: string | null } | null | undefined
): boolean {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;
  const perms = getUserPermissions(user);
  return perms.canDelete;
}

export function isFinancialsHidden(
  user: { role: string; permissions?: string | null } | null | undefined
): boolean {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return false;
  const perms = getUserPermissions(user);
  return perms.hideFinancialAmounts;
}

export function formatCurrencyOrMasked(
  amount: number | string | null | undefined,
  hideFinancials: boolean
): string {
  if (hideFinancials) {
    return "••••••";
  }
  if (amount === null || amount === undefined) {
    return "₹0";
  }
  const numeric = typeof amount === "number" ? amount : parseFloat(amount);
  if (isNaN(numeric)) return "₹0";
  return `₹${numeric.toLocaleString("en-IN")}`;
}
