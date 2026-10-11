import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import ResidentsClient from "./ResidentsClient";

export const dynamic = "force-dynamic";

export default async function ResidentsPage({ searchParams }: { searchParams: { hostelId?: string; roomId?: string; bedId?: string; search?: string; new?: string; feeStayId?: string; view?: string } }) {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");
  if (!hasPermission(user.role, [ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER, ROLES.RECEPTIONIST, ROLES.FINANCE])) redirect("/admin");

  const [stays, hostels, roomRates, roomCategories] = await Promise.all([
    prisma.residentStay.findMany({
      orderBy: [{ status: "asc" }, { nextDueAt: "asc" }],
      take: 500,
      include: {
        resident: { select: { id: true, name: true, email: true, phone: true, gender: true, govtIdType: true, govtIdNumber: true, address: true, emergencyContact: true } },
        hostel: { select: { id: true, name: true, city: true, state: true } },
        room: { select: { id: true, roomNumber: true, floor: true, roomType: { select: { name: true, totalBeds: true } } } },
        bed: { select: { id: true, bedNumber: true, tier: true } },
        feeReceipts: { orderBy: { receivedAt: "desc" }, take: 3 },
      },
    }),
    prisma.hostel.findMany({
      where: { active: true },
      orderBy: [{ city: "asc" }, { name: "asc" }],
      select: {
        id: true, name: true, city: true,
        rooms: {
          where: { active: true, status: "ACTIVE" },
          orderBy: [{ floor: "asc" }, { roomNumber: "asc" }],
          select: { id: true, roomNumber: true, floor: true, capacity: true, isAC: true, roomType: { select: { name: true } }, beds: { where: { active: true, status: "AVAILABLE" }, select: { id: true, bedNumber: true, tier: true } } },
        },
      },
    }),
    prisma.$queryRaw<Array<{ hostelId: string; capacity: number; isAC: boolean; rateCategory: string; pricingUnit: string; monthlyRate: number }>>`SELECT hostelId, capacity, isAC, rateCategory, pricingUnit, monthlyRate FROM HostelRoomRate`,
    prisma.$queryRaw<Array<{ id: string; rateCategory: string }>>`SELECT id, rateCategory FROM Room`,
  ]);

  const hostelsWithRates = hostels.map((hostel) => ({ ...hostel, rooms: hostel.rooms.map((room) => ({ ...room, rateCategory: roomCategories.find((item) => item.id === room.id)?.rateCategory || "STANDARD" })), roomRates: roomRates.filter((rate) => rate.hostelId === hostel.id).map((rate) => ({ ...rate, isAC: Boolean(rate.isAC) })) }));
  return <ResidentsClient initialStays={stays} hostels={hostelsWithRates} canRegister={user.role !== ROLES.FINANCE} canVacate={user.role !== ROLES.FINANCE} initialHostelId={searchParams.hostelId || "all"} initialRoomId={searchParams.roomId || ""} initialBedId={searchParams.bedId || ""} initialSearch={searchParams.search || ""} initiallyOpen={searchParams.new === "1" && user.role !== ROLES.FINANCE} initialFeeStayId={searchParams.feeStayId || ""} />;
}
