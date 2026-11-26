export interface ExpenseCategoryMeta {
  code: string;
  label: string;
  shortLabel: string;
  description: string;
  badgeColor: string;
  barColor: string;
  priority: boolean;
}

export const EXPENSE_CATEGORIES: ExpenseCategoryMeta[] = [
  {
    code: "POWER_BILLS",
    label: "Power Bills",
    shortLabel: "Power",
    description: "EB / Electricity board bills & DG diesel",
    badgeColor: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    barColor: "bg-amber-400",
    priority: true,
  },
  {
    code: "WATER_BILLS",
    label: "Water Bills",
    shortLabel: "Water",
    description: "Water tankers, municipal water & RO supply",
    badgeColor: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    barColor: "bg-cyan-400",
    priority: true,
  },
  {
    code: "STAFF_SALARY",
    label: "Staff Salary",
    shortLabel: "Salary",
    description: "Warden, cook, security, housekeeping & helper pay",
    badgeColor: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    barColor: "bg-violet-400",
    priority: true,
  },
  {
    code: "ELECTRIC_WORKS",
    label: "Electric Works",
    shortLabel: "Electric",
    description: "Electrician charges, switches, lights, wiring & MCBs",
    badgeColor: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    barColor: "bg-yellow-400",
    priority: true,
  },
  {
    code: "PLUMBING_WORKS",
    label: "Plumbing Works",
    shortLabel: "Plumbing",
    description: "Plumber charges, taps, pipes, motors & bathroom leaks",
    badgeColor: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    barColor: "bg-sky-400",
    priority: true,
  },
  {
    code: "DAILY_ESSENTIALS",
    label: "Daily Essentials",
    shortLabel: "Essentials",
    description: "Cleaning liquids, broom, soap, milk, tea & small petty cash",
    badgeColor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    barColor: "bg-emerald-400",
    priority: true,
  },
  {
    code: "INTERNET_WIFI",
    label: "Internet & Wi-Fi",
    shortLabel: "Wi-Fi",
    description: "Broadband plans, routers & CCTV internet",
    badgeColor: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    barColor: "bg-indigo-400",
    priority: false,
  },
  {
    code: "FOOD_KITCHEN",
    label: "Food & Kitchen",
    shortLabel: "Kitchen",
    description: "Groceries, vegetables, cooking gas cylinders & ration",
    badgeColor: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    barColor: "bg-orange-400",
    priority: false,
  },
  {
    code: "HOUSEKEEPING_LAUNDRY",
    label: "Housekeeping & Laundry",
    shortLabel: "Housekeeping",
    description: "Bed linen wash, pest control, garbage & deep cleaning",
    badgeColor: "bg-teal-500/15 text-teal-300 border-teal-500/30",
    barColor: "bg-teal-400",
    priority: false,
  },
  {
    code: "PROPERTY_RENT",
    label: "Building Rent & Tax",
    shortLabel: "Building Rent",
    description: "Monthly building lease rent, municipal tax & society fees",
    badgeColor: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    barColor: "bg-rose-400",
    priority: false,
  },
  {
    code: "APPLIANCES_REPAIRS",
    label: "AC & Appliance Repairs",
    shortLabel: "Repairs",
    description: "AC servicing, geyser, washing machine, fridge & lift maintenance",
    badgeColor: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
    barColor: "bg-fuchsia-400",
    priority: false,
  },
  {
    code: "OTHER",
    label: "Other Expenses",
    shortLabel: "Other",
    description: "Printing, stationery, transport & miscellaneous spends",
    badgeColor: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
    barColor: "bg-zinc-400",
    priority: false,
  },
];

export const VALID_EXPENSE_CATEGORY_CODES = new Set(EXPENSE_CATEGORIES.map((c) => c.code));

export const EXPENSE_PAYMENT_MODES = [
  { code: "CASH", label: "Cash" },
  { code: "UPI", label: "UPI / PhonePe / GPay" },
  { code: "BANK_TRANSFER", label: "Bank Transfer / NEFT" },
  { code: "CARD", label: "Card" },
] as const;

export const VALID_EXPENSE_PAYMENT_MODES = new Set<string>(
  EXPENSE_PAYMENT_MODES.map((m) => m.code)
);

export const VALID_EXPENSE_STATUSES = new Set<string>(["PAID", "PENDING"]);

export function getExpenseCategoryMeta(code: string): ExpenseCategoryMeta {
  return (
    EXPENSE_CATEGORIES.find((c) => c.code === code) ||
    EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
  );
}

export function getExpensePaymentModeLabel(mode: string): string {
  return EXPENSE_PAYMENT_MODES.find((m) => m.code === mode)?.label || mode;
}
