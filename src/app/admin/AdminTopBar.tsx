import { Building2, Search } from "lucide-react";

export default function AdminTopBar({ user }: { user: { name: string; role: string } }) {
  return <header className="hidden h-[66px] items-center justify-between border-b border-slate-200 bg-white px-7 md:flex">
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"><Building2 size={19} className="text-teal-600"/><div><p className="text-xs font-semibold text-slate-900">All hostel locations</p><p className="text-[11px] text-slate-500">Choose a hostel on each page</p></div></div>
    <div className="flex items-center gap-5"><div className="relative w-72"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><a href="/admin/residents" className="block rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs text-slate-500">Search residents, rooms or beds…</a></div><div className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">{user.name.slice(0,1).toUpperCase()}</span><div><p className="text-xs font-semibold text-slate-900">{user.name}</p><p className="text-[11px] text-slate-500">{user.role.replaceAll("_", " ")}</p></div></div></div>
  </header>;
}
