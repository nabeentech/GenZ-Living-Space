"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertCircle, CalendarDays, Check, ChevronLeft, ChevronRight, CircleDollarSign, X } from "lucide-react";

export type CalendarEvent = { id: string; stayId: string; date: string; resident: string; hostel: string; room: string; bed: string; amount: number; status: "paid" | "overdue" | "today" | "soon" | "upcoming"; canCollect: boolean };
const statusStyle: Record<CalendarEvent["status"], string> = { paid: "border-emerald-200 bg-emerald-50 text-emerald-800", overdue: "border-rose-200 bg-rose-50 text-rose-800", today: "border-blue-200 bg-blue-50 text-blue-800", soon: "border-amber-200 bg-amber-50 text-amber-900", upcoming: "border-slate-200 bg-slate-50 text-slate-700" };
const dotStyle: Record<CalendarEvent["status"], string> = { paid: "bg-emerald-500", overdue: "bg-rose-500", today: "bg-blue-600", soon: "bg-amber-500", upcoming: "bg-slate-400" };
const label: Record<CalendarEvent["status"], string> = { paid: "Paid", overdue: "Overdue", today: "Due today", soon: "Due soon", upcoming: "Upcoming" };

export default function FeeCalendar({ month, events, compact = false }: { month: string; events: CalendarEvent[]; compact?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [year, monthIndex] = month.split("-").map(Number);
  const firstDay = new Date(year, monthIndex - 1, 1);
  const daysInMonth = new Date(year, monthIndex, 0).getDate();
  const startOffset = firstDay.getDay();
  const cells = Array.from({ length: Math.ceil((startOffset + daysInMonth) / 7) * 7 }, (_, i) => i - startOffset + 1);
  const byDay = new Map<number, CalendarEvent[]>();
  for (const event of events) {
    const day = Number(event.date.slice(8, 10));
    byDay.set(day, [...(byDay.get(day) || []), event]);
  }
  const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
  const money = (value: number) => `₹${Number(value).toLocaleString("en-IN")}`;
  const collected = events.filter((event) => event.status === "paid").reduce((sum, event) => sum + event.amount, 0);
  const outstanding = events.filter((event) => ["overdue", "today", "soon"].includes(event.status)).reduce((sum, event) => sum + event.amount, 0);
  const overdue = events.filter((event) => event.status === "overdue");
  const attention = events.filter((event) => event.status !== "paid").sort((a, b) => a.date.localeCompare(b.date)).slice(0, compact ? 4 : 6);

  function changeMonth(delta: number) {
    const next = new Date(year, monthIndex - 1 + delta, 1);
    const nextMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
    const target = `${pathname}?month=${nextMonth}`;
    router.push(target);
  }
  async function collectFee() {
    if (!activeEvent) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/residents/${activeEvent.stayId}/fee`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method, note }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not record fee");
      setMessage(`Fee collected for ${activeEvent.resident}.`); setActiveEvent(null); setNote(""); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not record fee"); }
    finally { setBusy(false); }
  }

  return <div className={compact ? "" : "-m-4 min-h-full bg-[#f5f7fb] p-4 text-slate-900 sm:-m-6 sm:p-6 lg:-m-8 lg:p-7"}><div className={compact ? "" : "mx-auto max-w-[1500px] space-y-4"}>
    {!compact && <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-bold tracking-tight text-slate-950">Fee Calendar</h1><p className="mt-1 text-sm text-slate-600">See each monthly due date and record in-person collections.</p></div><div className="flex gap-2"><button onClick={()=>router.push("/admin/residents?view=fees")} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Resident list</button></div></header>}
    {message && <p role="status" className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"><Check size={15}/>{message}</p>}
    <div className={compact ? "grid gap-3" : "grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]"}>
      <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 sm:p-5"><div className="mb-3 flex items-center justify-between"><div><h2 className={`font-bold text-slate-950 ${compact ? "text-base" : "text-xl"}`}>{compact ? "Fee due calendar" : firstDay.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</h2>{compact && <p className="mt-0.5 text-[11px] text-slate-500">{firstDay.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>}</div><div className="flex items-center gap-1"><button onClick={()=>changeMonth(-1)} aria-label="Previous month" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><ChevronLeft size={18}/></button>{compact && <a href={`/admin/calendar?month=${month}`} className="mx-1 text-xs font-semibold text-blue-700">Full calendar</a>}<button onClick={()=>changeMonth(1)} aria-label="Next month" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><ChevronRight size={18}/></button></div></div>
        <div className="grid grid-cols-7 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day)=><div key={day} className="py-2">{compact ? day.slice(0,1) : day}</div>)}</div>
        <div className={`grid grid-cols-7 gap-1 ${compact ? "" : "gap-2"}`}>{cells.map((day, index) => { const inMonth = day > 0 && day <= daysInMonth; const displayDay = day < 1 ? new Date(year, monthIndex - 1, day).getDate() : day > daysInMonth ? day - daysInMonth : day; const dayEvents = inMonth ? byDay.get(day) || [] : []; const today = inMonth && new Date().toDateString() === new Date(year, monthIndex - 1, day).toDateString(); return <div key={index} className={`min-h-[53px] rounded-md border p-1 sm:min-h-[70px] ${compact ? "sm:min-h-[55px]" : "sm:min-h-[105px]"} ${inMonth ? today ? "border-blue-300 bg-blue-50/60" : "border-slate-100 bg-white" : "border-transparent bg-slate-50/50"}`}><span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] ${today ? "bg-emerald-600 font-bold text-white" : inMonth ? "text-slate-700" : "text-slate-300"}`}>{displayDay}</span><div className="mt-0.5 space-y-1">{dayEvents.slice(0, compact ? 1 : 3).map((event)=><button key={event.id} title={`${event.resident} · ${money(event.amount)} · ${label[event.status]}`} onClick={()=>{if(event.canCollect){setActiveEvent(event);setError("");}else if(!compact)setMessage(`${event.resident} · ${label[event.status]} · ${money(event.amount)}`)}} className={`block w-full truncate rounded border px-1 py-0.5 text-left text-[9px] leading-tight ${statusStyle[event.status]} ${event.canCollect?"cursor-pointer":"cursor-default"}`}>{compact ? <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${dotStyle[event.status]}`}/> : null}{compact ? event.resident.split(" ")[0] : `${event.resident.split(" ")[0]} · ${money(event.amount)}`}</button>)}{dayEvents.length > (compact ? 1 : 3) && <span className="block pl-1 text-[9px] text-slate-400">+{dayEvents.length - (compact ? 1 : 3)} more</span>}</div></div>})}</div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-[10px] text-slate-600 sm:text-xs">{(["paid","soon","today","overdue"] as const).map((status)=><span key={status} className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${dotStyle[status]}`}/>{label[status]}</span>)}</div>
      </section>
      {!compact && <aside className="space-y-4"><section className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">This month</p><h2 className="mt-1 text-lg font-bold text-slate-950">Fee summary</h2></div><CalendarDays className="text-blue-600" size={20}/></div><div className="mt-4 grid grid-cols-2 gap-2"><Summary label="Collected" amount={collected} tone="green"/><Summary label="Due / soon" amount={outstanding} tone="amber"/><Summary label="Overdue residents" amount={overdue.length} tone="rose" count/><Summary label="Fee events" amount={events.length} tone="blue" count/></div></section>
        <section className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><div><h2 className="font-bold text-slate-950">Due dates</h2><p className="mt-1 text-xs text-slate-500">Tap a resident to record a collected fee</p></div><span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">{attention.length} shown</span></div>{attention.length ? <div className="mt-3 divide-y divide-slate-100">{attention.map((event)=><div key={event.id} className="flex items-center justify-between gap-2 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{event.resident}</p><p className="mt-0.5 truncate text-xs text-slate-500">{event.hostel} · Room {event.room} · {event.bed}</p><p className="mt-1 text-[11px] text-slate-500">{dateFmt.format(new Date(`${event.date}T00:00:00`))} · {label[event.status]}</p></div><div className="shrink-0 text-right"><p className="text-sm font-bold text-slate-900">{money(event.amount)}</p>{event.canCollect && <button onClick={()=>{setActiveEvent(event);setError("")}} className="mt-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700">Mark collected</button>}</div></div>)}</div> : <p className="py-8 text-center text-sm text-slate-500">No fees to show this month.</p>}</section>
        <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-4"><div className="flex gap-2"><AlertCircle size={17} className="mt-0.5 shrink-0 text-blue-700"/><p className="text-xs leading-5 text-blue-900">Collections are recorded after the owner receives the fee in person. The next due date follows the resident’s joining date.</p></div></section></aside>}
    </div>
    {activeEvent && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4"><section role="dialog" aria-modal="true" aria-labelledby="collect-title" className="w-full max-w-md rounded-xl bg-white shadow-xl"><div className="flex items-start justify-between border-b border-slate-200 px-5 py-4"><div><h2 id="collect-title" className="text-lg font-bold text-slate-950">Record fee collected</h2><p className="mt-1 text-xs text-slate-500">{activeEvent.resident} · {activeEvent.hostel}, room {activeEvent.room}</p></div><button onClick={()=>setActiveEvent(null)} aria-label="Close" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"><X size={18}/></button></div><div className="space-y-4 p-5">{error&&<p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}<div className="rounded-lg bg-emerald-50 p-4"><p className="text-xs text-emerald-800">Amount received in person</p><p className="mt-1 text-2xl font-bold text-emerald-950">{money(activeEvent.amount)}</p></div><label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-700">How was it received?</span><select value={method} onChange={(e)=>setMethod(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="CASH">Cash</option><option value="UPI">UPI, paid in person</option><option value="BANK_TRANSFER">Bank transfer</option><option value="OTHER">Other</option></select></label><label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-700">Note (optional)</span><input value={note} onChange={(e)=>setNote(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" placeholder="Receipt reference or note"/></label><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button onClick={()=>setActiveEvent(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button><button disabled={busy} onClick={collectFee} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"><CircleDollarSign size={16}/>{busy?"Saving…":"Confirm collected"}</button></div></div></section></div>}
  </div></div>;
}

function Summary({label,amount,tone,count=false}:{label:string;amount:number;tone:string;count?:boolean}){const color:Record<string,string>={green:"text-emerald-700 bg-emerald-50",amber:"text-amber-800 bg-amber-50",rose:"text-rose-700 bg-rose-50",blue:"text-blue-700 bg-blue-50"};return <div className={`rounded-lg p-3 ${color[tone]}`}><p className="text-[11px] opacity-80">{label}</p><p className="mt-1 text-lg font-bold">{count?amount: `₹${amount.toLocaleString("en-IN")}`}</p></div>}
