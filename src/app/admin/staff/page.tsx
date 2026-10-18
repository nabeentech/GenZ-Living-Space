import React from "react";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSessionUser, ROLES } from "@/lib/auth";
import { parsePermissions } from "@/lib/permissions";
import StaffManagementClient from "./StaffManagementClient";

export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Strictly Super Admin only
  if (user.role !== ROLES.SUPER_ADMIN) {
    redirect("/admin");
  }

  const staffUsers = await prisma.user.findMany({
    where: {
      role: {
        not: "CUSTOMER",
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      active: true,
      permissions: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const staffList = staffUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    active: u.active,
    permissions: u.permissions,
    parsedPermissions: parsePermissions(u.permissions, u.role),
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  }));

  return (
    <StaffManagementClient
      initialStaff={staffList}
      currentUserId={user.id}
    />
  );
}
