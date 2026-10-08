"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  LayoutDashboard,
  Grid,
  QrCode,
  UserPlus,
  BookOpen,
  Sparkle,
  HelpCircle,
  Tag,
  CreditCard,
  BarChart3,
  Globe,
  FileText,
  Menu,
  X,
  LogOut,
  Shield,
  Layers,
  Users,
  Calendar,
  Wind,
} from "lucide-react";
import Badge from "@/components/ui/Badge";

interface AdminSidebarProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ user }) => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const allNavItems: { label: string; href: string; icon: React.ReactNode; roles: string[] }[] = [
    { label: "Dashboard Overview", href: "/admin", icon: <LayoutDashboard className="w-4 h-4" />, roles: ["SUPER_ADMIN", "FINANCE", "HOUSEKEEPING", "SUPPORT_STAFF"] },
    { label: "Reception Desk", href: "/admin/receptionist", icon: <QrCode className="w-4 h-4" />, roles: ["RECEPTIONIST", "SUPER_ADMIN"] },
    { label: "Manager Panel", href: "/admin/manager", icon: <LayoutDashboard className="w-4 h-4" />, roles: ["PROPERTY_MANAGER", "SUPER_ADMIN"] },
    { label: "Visual Bed Matrix", href: "/admin/beds", icon: <Grid className="w-4 h-4" />, roles: ["PROPERTY_MANAGER", "SUPER_ADMIN"] },
    { label: "Room Management", href: "/admin/rooms", icon: <Wind className="w-4 h-4" />, roles: ["PROPERTY_MANAGER", "RECEPTIONIST", "SUPER_ADMIN"] },
    { label: "Check-In / Out QR Desk", href: "/admin/checkin", icon: <QrCode className="w-4 h-4" />, roles: ["RECEPTIONIST", "PROPERTY_MANAGER", "SUPER_ADMIN"] },
    { label: "Walk-In Reservation", href: "/admin/walkin", icon: <UserPlus className="w-4 h-4" />, roles: ["RECEPTIONIST", "PROPERTY_MANAGER", "SUPER_ADMIN"] },
    { label: "Bookings Management", href: "/admin/bookings", icon: <BookOpen className="w-4 h-4" />, roles: ["RECEPTIONIST", "PROPERTY_MANAGER", "SUPER_ADMIN"] },
    { label: "Stay Extensions", href: "/admin/extensions", icon: <Calendar className="w-4 h-4" />, roles: ["PROPERTY_MANAGER", "FINANCE", "SUPER_ADMIN"] },
    { label: "Customers Directory", href: "/admin/customers", icon: <Users className="w-4 h-4" />, roles: ["PROPERTY_MANAGER", "SUPER_ADMIN"] },
    { label: "Housekeeping & Clean", href: "/admin/housekeeping", icon: <Sparkle className="w-4 h-4" />, roles: ["PROPERTY_MANAGER", "HOUSEKEEPING", "SUPER_ADMIN"] },
    { label: "Complaints & Support", href: "/admin/complaints", icon: <HelpCircle className="w-4 h-4" />, roles: ["PROPERTY_MANAGER", "SUPPORT_STAFF", "SUPER_ADMIN"] },
    { label: "Coupons & Promos", href: "/admin/coupons", icon: <Tag className="w-4 h-4" />, roles: ["SUPER_ADMIN"] },
    { label: "Payments & Invoices", href: "/admin/payments", icon: <CreditCard className="w-4 h-4" />, roles: ["FINANCE", "SUPER_ADMIN"] },
    { label: "Reports & Analytics", href: "/admin/reports", icon: <BarChart3 className="w-4 h-4" />, roles: ["FINANCE", "SUPER_ADMIN"] },
    { label: "Website CMS", href: "/admin/cms", icon: <Globe className="w-4 h-4" />, roles: ["SUPER_ADMIN"] },
    { label: "Audit Logs", href: "/admin/audit-logs", icon: <FileText className="w-4 h-4" />, roles: ["SUPER_ADMIN"] },
  ];
  const navItems = allNavItems.filter((item) => item.roles.includes(user.role));

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/auth/login";
  };

  return (
    <>
      {/* Mobile Top Toggle */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#0B0F19] border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-extrabold text-sm text-white">GenZ Hostels OS</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 rounded-lg bg-slate-900 text-slate-300 hover:text-white"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Container */}
      <aside
        className={`${
          isOpen ? "block" : "hidden"
        } md:block w-full md:w-64 bg-[#0B0F19] border-r border-slate-800/80 flex flex-col shrink-0 min-h-screen z-30 transition-all`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800/80">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-black text-base tracking-tight text-white block">
                GenZ <span className="text-indigo-400">Hostels OS</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                Proprietary PMS
              </span>
            </div>
          </Link>

          {/* User Role Card */}
          <div className="mt-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5 truncate">
              <span className="font-bold text-xs text-white block truncate">
                {user.name}
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                {user.email}
              </span>
            </div>
            <Badge variant="indigo" size="sm" className="shrink-0 text-[9px]">
              {user.role.replace("_", " ")}
            </Badge>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-glow"
                    : "text-slate-400 hover:text-white hover:bg-slate-900/60"
                }`}
              >
                <span className={isActive ? "text-white" : "text-slate-400"}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-800/80 space-y-2">
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-900 transition"
          >
            <Layers className="w-4 h-4 text-slate-500" />
            <span>Customer Website</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
