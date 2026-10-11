import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import { buildFeeCalendarEvents } from "@/lib/fee-calendar";
import FeeCalendar, { type CalendarEvent } from "./FeeCalendar";

export const dynamic = "force-dynamic";

export default async function CalendarPage({ searchParams }: { searchParams: { month?: string } }) {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");
  if (!hasPermission(user.role, [ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER, ROLES.RECEPTIONIST, ROLES.FINANCE])) redirect("/admin");
  const now = new Date();
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.month || "") ? searchParams.month! : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [year, monthNumber] = month.split("-").map(Number);
  const monthStart = new Date(Date.UTC(year, monthNumber - 1, 1));
  const monthEnd = new Date(Date.UTC(year, monthNumber, 1));
  const stays = await prisma.residentStay.findMany({
    where: { status: "ACTIVE", hostel: { active: true } },
    include: {
      resident: { select: { name: true } }, hostel: { select: { name: true } },
      room: { select: { roomNumber: true } }, bed: { select: { bedNumber: true } },
      feeReceipts: { where: { periodStart: { gte: monthStart, lt: monthEnd } }, select: { id: true, periodStart: true, amount: true } },
    },
  });
  const events = buildFeeCalendarEvents(stays, year, monthNumber, now) as CalendarEvent[];
  return <FeeCalendar month={month} events={events} />;
}
