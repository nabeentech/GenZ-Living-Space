import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import PricingManagementClient from "./PricingManagementClient";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");
  if (!hasPermission(user.role, [ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER])) redirect("/admin");
  const hostels = await prisma.hostel.findMany({ where: { active: true }, orderBy: [{ city: "asc" }, { name: "asc" }], include: { rooms: { where: { active: true }, orderBy: { roomNumber: "asc" }, include: { beds: { where: { active: true }, select: { id: true } } } } } });
  const [rates, roomCategories] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; hostelId: string; capacity: number; isAC: boolean; rateCategory: string; pricingUnit: string; monthlyRate: number }>>`SELECT id, hostelId, capacity, isAC, rateCategory, pricingUnit, monthlyRate FROM HostelRoomRate`,
    prisma.$queryRaw<Array<{ id: string; rateCategory: string }>>`SELECT id, rateCategory FROM Room`,
  ]);
  return <PricingManagementClient hostels={hostels.map((hostel) => ({ ...hostel, rooms: hostel.rooms.map((room) => ({ ...room, rateCategory: roomCategories.find((row) => row.id === room.id)?.rateCategory || "STANDARD" })), roomRates: rates.filter((rate) => rate.hostelId === hostel.id).map((rate) => ({ ...rate, isAC: Boolean(rate.isAC) })) }))} />;
}
