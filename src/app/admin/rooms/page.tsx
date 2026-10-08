import React from "react";
import { redirect } from "next/navigation";
import { getSessionUser, ROLES } from "@/lib/auth";
import { RoomsManagementClient } from "./RoomsManagementClient";

export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  const sessionUser = await getSessionUser();

  // Restrict access to admin, receptionist, and supervisor
  if (
    !sessionUser ||
    ![ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER, ROLES.RECEPTIONIST].includes(sessionUser.role as any)
  ) {
    redirect("/auth/login");
  }

  return (
    <div className="space-y-6">
      <RoomsManagementClient />
    </div>
  );
}
