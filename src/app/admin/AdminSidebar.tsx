"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BedDouble, Building2, CalendarDays, LayoutDashboard, LogOut, Menu, Tag, Users, X } from "lucide-react";

type User = { name: string; email: string; role: string };
const navigation = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, roles: ["SUPER_ADMIN", "PROPERTY_MANAGER", "RECEPTIONIST", "FINANCE"] },
  { label: "Beds & Rooms", href: "/admin/beds", icon: BedDouble, roles: ["SUPER_ADMIN", "PROPERTY_MANAGER", "RECEPTIONIST"] },
  { label: "Residents", href: "/admin/residents", icon: Users, roles: ["SUPER_ADMIN", "PROPERTY_MANAGER", "RECEPTIONIST", "FINANCE"] },
  { label: "Calendar", href: "/admin/calendar", icon: CalendarDays, roles: ["SUPER_ADMIN", "PROPERTY_MANAGER", "RECEPTIONIST", "FINANCE"] },
  { label: "Pricing", href: "/admin/pricing", icon: Tag, roles: ["SUPER_ADMIN", "PROPERTY_MANAGER"] },
  { label: "Hostels", href: "/admin/hostels", icon: Building2, roles: ["SUPER_ADMIN", "PROPERTY_MANAGER"] },
];

export default function AdminSidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/auth/login");
    router.refresh();
  }

  return <>
    <div className="flex items-center justify-between bg-[#14263b] px-4 py-3 text-white md:hidden">
      <Link href="/admin" className="flex items-center gap-2.5 font-semibold"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500"><Building2 size={19}/></span><span>StayEase <small className="block text-[11px] font-normal text-slate-300">Hostel Management</small></span></Link>
      <button aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen(!open)} className="rounded-md p-2 text-slate-300 hover:bg-slate-800">{open ? <X size={19}/> : <Menu size={19}/>}</button>
    </div>
    <aside className={`${open ? "block" : "hidden"} fixed inset-y-0 left-0 z-40 w-56 flex-col bg-[#14263b] text-slate-200 md:sticky md:top-0 md:flex md:h-screen md:shrink-0`}>
      <div className="border-b border-white/10 px-5 py-4"><Link href="/admin" className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500"><Building2 size={19}/></span><span className="text-white"><span className="block text-base font-bold">StayEase</span><span className="block text-[11px] text-slate-300">Hostel Management</span></span></Link></div>
      <nav aria-label="Main navigation" className="flex-1 space-y-1 px-2 py-4">{navigation.filter((item) => item.roles.includes(user.role)).map(({ label, href, icon: Icon }) => {
        const active = href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return <Link key={label} href={href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${active ? "bg-blue-600 text-white shadow-sm" : "text-slate-200 hover:bg-white/10 hover:text-white"}`}><Icon size={19}/>{label}</Link>;
      })}</nav>
      <div className="border-t border-white/10 p-3"><div className="truncate px-2 pb-2 text-xs text-slate-300">{user.name} · {user.role.replaceAll("_", " ")}</div><button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white"><LogOut size={17}/>Sign out</button><div className="px-3 pb-1 pt-3 text-[11px] text-slate-400">Phase 1 · Staff operations</div></div>
    </aside>
    {open && <button aria-label="Close navigation overlay" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-slate-950/40 md:hidden"/>}
  </>;
}
