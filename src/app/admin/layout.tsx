import React from "react";
import { redirect } from "next/navigation";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import AdminSidebar from "./AdminSidebar";
import AdminTopBar from "./AdminTopBar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Check if role has access to admin
  const allowedRoles = [
    ROLES.SUPER_ADMIN,
    ROLES.PROPERTY_MANAGER,
    ROLES.SUPERVISOR,
    ROLES.RECEPTIONIST,
    ROLES.FINANCE,
    ROLES.HOUSEKEEPING,
    ROLES.SUPPORT_STAFF,
  ];

  if (!hasPermission(user.role, allowedRoles)) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col lg:h-dvh lg:min-h-0 lg:flex-row lg:overflow-hidden overflow-x-clip antialiased">
      {/* Sidebar Component */}
      <AdminSidebar user={user} />

      {/* Main Administrative Workspace */}
      <div className="flex-1 flex flex-col min-w-0 lg:h-full lg:min-h-0">
        <AdminTopBar user={user} />
        <main className="flex-1 min-w-0 p-3 sm:p-5 lg:p-8 lg:min-h-0 lg:overflow-y-auto lg:overflow-x-hidden lg:overscroll-contain">
          {children}
        </main>
      </div>
    </div>
  );
}
