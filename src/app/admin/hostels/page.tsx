import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import HostelsClient from "./HostelsClient";

export const dynamic = "force-dynamic";

export default async function HostelsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");
  if (!hasPermission(user.role, [ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER])) redirect("/admin");
  const hostels = await prisma.hostel.findMany({
    orderBy: [{ active: "desc" }, { city: "asc" }, { name: "asc" }],
    include: { rooms: { where: { active: true }, include: { beds: { where: { active: true }, select: { id: true, status: true } } } }, residentStays: { where: { status: "ACTIVE" }, select: { id: true } } },
  });
  return <HostelsClient initialHostels={hostels} />;
}
