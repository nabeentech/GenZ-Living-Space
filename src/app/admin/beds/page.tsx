import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import InventoryClient from "./InventoryClient";

export const dynamic = "force-dynamic";

export default async function BedsPage({ searchParams }: { searchParams: { hostelId?: string; floor?: string } }) {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");
  if (!hasPermission(user.role, [ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER, ROLES.RECEPTIONIST])) redirect("/admin");
  const hostels = await prisma.hostel.findMany({
    where: { active: true }, orderBy: [{ city: "asc" }, { name: "asc" }],
    include: { rooms: { where: { active: true }, orderBy: [{ floor: "asc" }, { roomNumber: "asc" }], include: { roomType: { select: { name: true } }, beds: { where: { active: true }, orderBy: { bedNumber: "asc" }, select: { id: true, bedNumber: true, status: true, tier: true, currentOccupantId: true, residentStays: { where: { status: "ACTIVE" }, take: 1, select: { resident: { select: { name: true } } } } } } } } },
  });
  const roomCategories = await prisma.$queryRaw<Array<{ id: string; rateCategory: string }>>`SELECT id, rateCategory FROM Room`;
  const inventory = hostels.map((hostel) => ({ ...hostel, rooms: hostel.rooms.map((room) => ({ ...room, rateCategory: roomCategories.find((item) => item.id === room.id)?.rateCategory || "STANDARD", beds: room.beds.map((bed) => ({ ...bed, stay: bed.residentStays[0] || null })) })) }));
  return <InventoryClient hostels={inventory} canManageRooms={user.role !== ROLES.RECEPTIONIST} initialHostelId={searchParams.hostelId || ""} initialFloor={searchParams.floor || "all"} />;
}
