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
    ROLES.RECEPTIONIST,
    ROLES.FINANCE,
    ROLES.HOUSEKEEPING,
    ROLES.SUPPORT_STAFF,
  ];

  if (!hasPermission(user.role, allowedRoles)) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col md:flex-row antialiased">
      {/* Sidebar Component */}
      <AdminSidebar user={user} />

      {/* Main Administrative Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopBar user={user} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
