export function addBillingMonth(value: Date): Date {
  const year = value.getUTCFullYear();
  const month = value.getUTCMonth();
  const day = value.getUTCDate();
  const firstDay = new Date(Date.UTC(year, month + 1, 1));
  const lastDay = new Date(Date.UTC(firstDay.getUTCFullYear(), firstDay.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(firstDay.getUTCFullYear(), firstDay.getUTCMonth(), Math.min(day, lastDay)));
}

export function nextBillingDate(joinedAt: Date, currentDueAt: Date): Date {
  const joinedYear = joinedAt.getUTCFullYear();
  const joinedMonth = joinedAt.getUTCMonth();
  const joinedDay = joinedAt.getUTCDate();
  const monthOffset = (currentDueAt.getUTCFullYear() - joinedYear) * 12 + currentDueAt.getUTCMonth() - joinedMonth + 1;
  const targetMonth = new Date(Date.UTC(joinedYear, joinedMonth + monthOffset, 1));
  const lastDay = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth(), Math.min(joinedDay, lastDay)));
}

export function billingStatus(nextDueAt: Date, now = new Date()) {
  const due = new Date(nextDueAt);
  due.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);

  if (days < 0) return { label: "Overdue", tone: "overdue" as const, days: Math.abs(days) };
  if (days === 0) return { label: "Due today", tone: "due" as const, days: 0 };
  if (days <= 7) return { label: "Due soon", tone: "soon" as const, days };
  return { label: "Up to date", tone: "current" as const, days };
}
