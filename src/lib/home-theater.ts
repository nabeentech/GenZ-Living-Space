export interface TheaterSlotDef {
  key: "MORNING" | "AFTERNOON" | "EVENING" | "NIGHT";
  label: string;
  timeRange: string;
  startHour24: number;
  startMinute: number;
  endHour24: number;
  endMinute: number;
  tag: string;
}

export const THEATER_SLOTS: TheaterSlotDef[] = [
  {
    key: "MORNING",
    label: "Morning Show",
    timeRange: "10:00 AM – 1:00 PM",
    startHour24: 10,
    startMinute: 0,
    endHour24: 13,
    endMinute: 0,
    tag: "3 Hours",
  },
  {
    key: "AFTERNOON",
    label: "Afternoon Show",
    timeRange: "2:00 PM – 5:00 PM",
    startHour24: 14,
    startMinute: 0,
    endHour24: 17,
    endMinute: 0,
    tag: "3 Hours",
  },
  {
    key: "EVENING",
    label: "Evening Show",
    timeRange: "6:00 PM – 9:00 PM",
    startHour24: 18,
    startMinute: 0,
    endHour24: 21,
    endMinute: 0,
    tag: "Prime Time",
  },
  {
    key: "NIGHT",
    label: "Late Night Show",
    timeRange: "9:30 PM – 12:30 AM",
    startHour24: 21,
    startMinute: 30,
    endHour24: 24,
    endMinute: 30,
    tag: "Late Show",
  },
];

export const VALID_THEATER_SLOT_KEYS = new Set<string>(THEATER_SLOTS.map((s) => s.key));

export const ACTIVE_THEATER_STATUSES = ["BOOKED", "BLOCKED", "COMPLETED"];

export function getTheaterSlotMeta(slotKey: string): TheaterSlotDef {
  return THEATER_SLOTS.find((s) => s.key === slotKey) || THEATER_SLOTS[0];
}

export function getIndiaNowDateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Checks whether a slot's end time in Asia/Kolkata has already passed (for booking guard),
 * or whether its start time has passed (for self-cancellation guard).
 */
export function isTheaterSlotPassed(slotDateKey: string, slotKey: string): boolean {
  const slot = getTheaterSlotMeta(slotKey);
  const now = new Date();
  const hh = String(slot.endHour24 >= 24 ? 23 : slot.endHour24).padStart(2, "0");
  const mm = String(slot.endHour24 >= 24 ? 59 : slot.endMinute).padStart(2, "0");
  const slotEnd = new Date(`${slotDateKey}T${hh}:${mm}:00+05:30`);
  if (slot.endHour24 >= 24) {
    slotEnd.setMinutes(slotEnd.getMinutes() + 31);
  }
  return now.getTime() >= slotEnd.getTime();
}

export function hasTheaterSlotStarted(slotDateKey: string, slotKey: string): boolean {
  const slot = getTheaterSlotMeta(slotKey);
  const hh = String(slot.startHour24).padStart(2, "0");
  const mm = String(slot.startMinute).padStart(2, "0");
  const slotStart = new Date(`${slotDateKey}T${hh}:${mm}:00+05:30`);
  return Date.now() >= slotStart.getTime();
}

export function formatTheaterDate(slotDateKey: string): string {
  const d = new Date(`${slotDateKey}T12:00:00+05:30`);
  if (Number.isNaN(d.getTime())) return slotDateKey;
  return d.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function generateTheaterBookingCode(): string {
  const nowKey = getIndiaNowDateKey().replace(/-/g, "").slice(2);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `HT-${nowKey}-${rand}`;
}
