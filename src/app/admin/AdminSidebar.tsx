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
  DollarSign,
  Image as ImageIcon,
  ShieldCheck,
  Film,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import { canAccessModule } from "@/lib/permissions";

interface AdminSidebarProps {
  user: {
    name: string;
    email: string;
    role: string;
    permissions?: string | null;
  };
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ user }) => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const allNavItems: { label: string; href: string; icon: React.ReactNode; roles: string[] }[] = [
    { label: "Dashboard Overview", href: "/admin", icon: <LayoutDashboard className="w-4 h-4" />, roles: ["SUPER_ADMIN", "FINANCE", "HOUSEKEEPING", "SUPPORT_STAFF", "PROPERTY_MANAGER", "SUPERVISOR", "RECEPTIONIST"] },
    { label: "Reception Desk", href: "/admin/receptionist", icon: <QrCode className="w-4 h-4" />, roles: ["RECEPTIONIST", "SUPER_ADMIN"] },
    { label: "Manager Panel", href: "/admin/manager", icon: <LayoutDashboard className="w-4 h-4" />, roles: ["PROPERTY_MANAGER", "SUPER_ADMIN"] },
    { label: "Visual Bed Matrix", href: "/admin/beds", icon: <Grid className="w-4 h-4" />, roles: ["PROPERTY_MANAGER", "SUPERVISOR", "SUPER_ADMIN"] },
    { label: "Room Management", href: "/admin/rooms", icon: <Wind className="w-4 h-4" />, roles: ["PROPERTY_MANAGER", "SUPERVISOR", "RECEPTIONIST", "SUPER_ADMIN"] },
    { label: "Pricing Management", href: "/admin/pricing", icon: <DollarSign className="w-4 h-4" />, roles: ["PROPERTY_MANAGER", "FINANCE", "SUPER_ADMIN"] },
    { label: "Check-In / Out QR Desk", href: "/admin/checkin", icon: <QrCode className="w-4 h-4" />, roles: ["RECEPTIONIST", "PROPERTY_MANAGER", "SUPERVISOR", "SUPER_ADMIN"] },
    { label: "Walk-In Reservation", href: "/admin/walkin", icon: <UserPlus className="w-4 h-4" />, roles: ["RECEPTIONIST", "PROPERTY_MANAGER", "SUPERVISOR", "SUPER_ADMIN"] },
    { label: "Bookings Management", href: "/admin/bookings", icon: <BookOpen className="w-4 h-4" />, roles: ["RECEPTIONIST", "PROPERTY_MANAGER", "SUPERVISOR", "SUPER_ADMIN"] },
    { label: "Home Theater", href: "/admin/theater", icon: <Film className="w-4 h-4" />, roles: ["RECEPTIONIST", "PROPERTY_MANAGER", "SUPERVISOR", "SUPER_ADMIN"] },
    { label: "Stay Extensions", href: "/admin/extensions", icon: <Calendar className="w-4 h-4" />, roles: ["PROPERTY_MANAGER", "FINANCE", "SUPER_ADMIN"] },
    { label: "Customers Directory", href: "/admin/customers", icon: <Users className="w-4 h-4" />, roles: ["PROPERTY_MANAGER", "SUPERVISOR", "SUPER_ADMIN"] },
    { label: "Housekeeping & Clean", href: "/admin/housekeeping", icon: <Sparkle className="w-4 h-4" />, roles: ["PROPERTY_MANAGER", "SUPERVISOR", "HOUSEKEEPING", "SUPER_ADMIN"] },
    { label: "Complaints & Support", href: "/admin/complaints", icon: <HelpCircle className="w-4 h-4" />, roles: ["PROPERTY_MANAGER", "SUPERVISOR", "SUPPORT_STAFF", "SUPER_ADMIN"] },
    { label: "Coupons & Promos", href: "/admin/coupons", icon: <Tag className="w-4 h-4" />, roles: ["SUPER_ADMIN"] },
    { label: "Payments & Invoices", href: "/admin/payments", icon: <CreditCard className="w-4 h-4" />, roles: ["PROPERTY_MANAGER", "FINANCE", "SUPER_ADMIN"] },
    { label: "Expenses & Bills", href: "/admin/expenses", icon: <DollarSign className="w-4 h-4" />, roles: ["PROPERTY_MANAGER", "FINANCE", "SUPER_ADMIN"] },
    { label: "Reports & Analytics", href: "/admin/reports", icon: <BarChart3 className="w-4 h-4" />, roles: ["FINANCE", "SUPER_ADMIN"] },
    { label: "Gallery Management", href: "/admin/gallery", icon: <ImageIcon className="w-4 h-4" />, roles: ["SUPER_ADMIN", "PROPERTY_MANAGER"] },
    { label: "Website CMS", href: "/admin/cms", icon: <Globe className="w-4 h-4" />, roles: ["SUPER_ADMIN"] },
    { label: "Audit Logs", href: "/admin/audit-logs", icon: <FileText className="w-4 h-4" />, roles: ["SUPER_ADMIN"] },
    { label: "Staff & Access Control", href: "/admin/staff", icon: <ShieldCheck className="w-4 h-4" />, roles: ["SUPER_ADMIN"] },
  ];

  const navItems = allNavItems.filter((item) => {
    if (user.role === "SUPER_ADMIN") return true;
    return canAccessModule(user, item.href);
  });

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/auth/login";
  };

  return (
    <>
      {/* Mobile & Tablet Sticky Top Toggle */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-[#0B0F19]/95 backdrop-blur-md border-b border-slate-800">
        <Link href="/admin" className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-pink-500 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-extrabold text-sm text-white truncate">GenZ Hostels OS</span>
        </Link>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle navigation menu"
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile & Tablet Drawer Backdrop */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container (Slide-over drawer on mobile/tablet, pinned on desktop lg+) */}
      <aside
        className={`${
          isOpen ? "fixed inset-y-0 left-0 flex w-72 z-50" : "hidden"
        } lg:static lg:flex lg:w-64 bg-[#0B0F19] border-r border-slate-800/80 flex-col shrink-0 h-dvh lg:h-screen lg:max-h-screen lg:min-h-0 lg:self-start overflow-hidden transition-all`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80 shrink-0 min-w-0">
          <Link href="/" className="flex items-center gap-3 group min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <span className="font-black text-base tracking-tight text-white block truncate">
                GenZ <span className="text-indigo-400">Hostels OS</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block truncate">
                Proprietary PMS
              </span>
            </div>
          </Link>

          {/* User Role Card */}
          <div className="mt-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 min-w-0">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span className="font-bold text-xs text-white truncate">
                {user.name}
              </span>
              <Badge variant="indigo" size="sm" className="shrink-0 text-[9px] whitespace-nowrap">
                {user.role.replace(/_/g, " ")}
              </Badge>
            </div>
            <span className="text-[10px] text-slate-400 block truncate" title={user.email}>
              {user.email}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 min-h-0 min-w-0 p-3 space-y-1 overflow-y-auto overscroll-y-contain custom-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`w-full min-w-0 flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                    : "text-slate-400 hover:text-white hover:bg-slate-900/60"
                }`}
              >
                <span className={`shrink-0 ${isActive ? "text-white" : "text-slate-400"}`}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-800/80 space-y-2 shrink-0 min-w-0">
          <Link
            href="/"
            className="w-full min-w-0 flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-900 transition"
          >
            <Layers className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="truncate">Customer Website</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full min-w-0 flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="truncate">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
