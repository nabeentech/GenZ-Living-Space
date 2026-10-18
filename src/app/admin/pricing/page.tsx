import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { canAccessModule, canUserEdit } from "@/lib/permissions";
import PricingManagementClient from "./PricingManagementClient";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const user = await getSessionUser();

  if (!user || !canAccessModule(user, "pricing")) {
    redirect("/admin");
  }

  const canEdit = canUserEdit(user);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PricingManagementClient canEdit={canEdit} />
    </div>
  );
}
