import { nextBillingDate } from "./resident-stays";

export type FeeCalendarStay = {
  id: string; joinedAt: Date; nextDueAt: Date; monthlyFee: number;
  resident: { name: string }; hostel: { name: string }; room: { roomNumber: string }; bed: { bedNumber: string };
  feeReceipts: { id: string; periodStart: Date; amount: number }[];
};

export function buildFeeCalendarEvents(stays: FeeCalendarStay[], year: number, monthNumber: number, now = new Date()) {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const events: Array<{ id: string; stayId: string; date: string; resident: string; hostel: string; room: string; bed: string; amount: number; status: "paid" | "overdue" | "today" | "soon" | "upcoming"; canCollect: boolean }> = [];
  const targetMonth = year * 12 + monthNumber - 1;
  for (const stay of stays) {
    const receipts = stay.feeReceipts.map((receipt) => ({
      id: receipt.id, stayId: stay.id, date: receipt.periodStart.toISOString().slice(0, 10), resident: stay.resident.name,
      hostel: stay.hostel.name, room: stay.room.roomNumber, bed: stay.bed.bedNumber, amount: receipt.amount,
      status: "paid" as const, canCollect: false,
    }));
    events.push(...receipts);
    let due = new Date(stay.nextDueAt);
    due = new Date(Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate()));
    const dueMonth = due.getUTCFullYear() * 12 + due.getUTCMonth();
    const actualDueKey = due.toISOString().slice(0, 10);
    const stayStartMonth = stay.joinedAt.getUTCFullYear() * 12 + stay.joinedAt.getUTCMonth();
    if (dueMonth < targetMonth && due.getTime() >= today) {
      for (let i = 0; i < 24 && due.getUTCFullYear() * 12 + due.getUTCMonth() < targetMonth; i += 1) due = nextBillingDate(stay.joinedAt, due);
    }
    const dueKey = due.toISOString().slice(0, 10);
    if (dueMonth >= stayStartMonth && due.getUTCFullYear() === year && due.getUTCMonth() === monthNumber - 1 && !receipts.some((receipt) => receipt.date === dueKey)) {
      const deltaDays = Math.floor((due.getTime() - today) / 86_400_000);
      const status = deltaDays < 0 ? "overdue" : deltaDays === 0 ? "today" : deltaDays <= 7 ? "soon" : "upcoming";
      events.push({ id: `due-${stay.id}-${dueKey}`, stayId: stay.id, date: dueKey, resident: stay.resident.name, hostel: stay.hostel.name, room: stay.room.roomNumber, bed: stay.bed.bedNumber, amount: stay.monthlyFee, status, canCollect: dueKey === actualDueKey && (status === "overdue" || status === "today" || status === "soon") });
    }
  }
  return events.sort((a, b) => a.date.localeCompare(b.date) || a.resident.localeCompare(b.resident));
}
