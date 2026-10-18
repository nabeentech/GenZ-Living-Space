import React from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { canAccessModule, canUserEdit } from "@/lib/permissions";
import { RoomsManagementClient } from "./RoomsManagementClient";

export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser || !canAccessModule(sessionUser, "rooms")) {
    redirect("/admin");
  }

  const canEdit = canUserEdit(sessionUser);

  return (
    <div className="space-y-6">
      <RoomsManagementClient canEdit={canEdit} />
    </div>
  );
}
