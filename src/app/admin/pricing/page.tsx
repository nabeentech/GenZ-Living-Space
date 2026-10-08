import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import PricingManagementClient from "./PricingManagementClient";

export default async function PricingPage() {
  const user = await getSessionUser();

  // Check if user is logged in and has property manager or super admin role
  if (!user || !["PROPERTY_MANAGER", "SUPER_ADMIN"].includes(user.role)) {
    redirect("/auth/login");
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PricingManagementClient />
    </div>
  );
}
