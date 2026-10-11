"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, IndianRupee, Info, Search, Snowflake, Users, Wind } from "lucide-react";

type Rate = { id?: string; capacity: number; isAC: boolean; rateCategory: string; pricingUnit: string; monthlyRate: number };
type Room = { id: string; roomNumber: string; floor: number; capacity: number; isAC: boolean; rateCategory: string; beds: { id: string }[] };
type Hostel = { id: string; name: string; city: string; state: string; roomRates: Rate[]; rooms: Room[] };
const categories = [{ capacity: 1, title: "Single Room", rateCategory: "STANDARD", unit: "PER_ROOM" }, { capacity: 2, title: "Double Room · Standard", rateCategory: "STANDARD", unit: "PER_BED" }, { capacity: 2, title: "Double Room · Discounted", rateCategory: "DISCOUNTED", unit: "PER_BED" }, { capacity: 3, title: "Triple Room", rateCategory: "STANDARD", unit: "PER_BED" }, { capacity: 4, title: "Four Sharing", rateCategory: "STANDARD", unit: "PER_BED" }];
const money = (value: number) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function PricingManagementClient({ hostels }: { hostels: Hostel[] }) {
  const router = useRouter();
  const [hostelId, setHostelId] = useState(hostels[0]?.id || "");
  const hostel = hostels.find((item) => item.id === hostelId);
  const [rates, setRates] = useState<Rate[]>(() => initialize(hostels[0]?.roomRates || []));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const roomRates = useMemo(() => hostel?.rooms.filter((room) => room.roomNumber.toLowerCase().includes(query.toLowerCase())) || [], [hostel, query]);

  function changeHostel(id: string) {
    setHostelId(id);
    setRates(initialize(hostels.find((item) => item.id === id)?.roomRates || []));
    setNotice(""); setError("");
  }
  function setPrice(category: typeof categories[number], isAC: boolean, value: string) {
    setRates((current) => current.map((rate) => rate.capacity === category.capacity && rate.rateCategory === category.rateCategory && rate.isAC === isAC ? { ...rate, monthlyRate: value === "" ? 0 : Number(value) } : rate));
  }
  async function save() {
    if (!hostel) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/admin/hostels/${hostel.id}/rates`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rates }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not save rates");
      setNotice(result.message); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save rates"); }
    finally { setSaving(false); }
  }

  return <div className="-m-4 min-h-full bg-[#f5f7fb] p-4 text-slate-900 sm:-m-6 sm:p-6 lg:-m-8 lg:p-7"><div className="mx-auto max-w-[1500px] space-y-4">
    <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div><h1 className="text-[28px] font-bold tracking-tight text-slate-950">Room pricing</h1><p className="mt-1 text-sm text-slate-600">Set a monthly price per bed for each room type at this hostel.</p></div><label className="flex min-w-72 items-center gap-3 rounded-lg border border-blue-100 bg-white px-3 py-2.5"><Building2 className="text-blue-600" size={21}/><span className="min-w-0 flex-1"><span className="block text-[11px] text-slate-500">Current hostel</span><select value={hostelId} onChange={(event) => changeHostel(event.target.value)} className="w-full truncate bg-transparent text-sm font-semibold text-slate-900 outline-none">{hostels.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.city}</option>)}</select></span></label></header>
    {notice && <p role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><Check size={16}/>{notice}</p>}{error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
    {!hostels.length ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><Building2 className="mx-auto text-slate-400"/><h2 className="mt-3 font-semibold">Add a hostel to set prices</h2><p className="mt-1 text-sm text-slate-500">Prices are saved separately for each hostel.</p></div> : <>
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"><div><h2 className="text-lg font-bold text-slate-950">Monthly price by room type</h2><p className="mt-1 text-xs text-slate-500">Set each AC and non-AC price. Standard and discounted double-share rooms have separate rates.</p></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{categories.map((category) => <article key={`${category.capacity}-${category.rateCategory}`} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Users size={20}/></span><div><h3 className="text-sm font-semibold text-slate-900">{category.title}</h3><p className="text-xs text-slate-500">{category.unit === "PER_ROOM" ? "Price per room" : `${category.capacity} beds · price per bed`}</p></div></div>
          <RateInput label="AC" unit={category.unit} icon={<Snowflake size={14}/>} value={rates.find((rate) => rate.capacity === category.capacity && rate.rateCategory === category.rateCategory && rate.isAC)?.monthlyRate || 0} onChange={(value) => setPrice(category, true, value)}/>
          <RateInput label="Non-AC" unit={category.unit} icon={<Wind size={14}/>} value={rates.find((rate) => rate.capacity === category.capacity && rate.rateCategory === category.rateCategory && !rate.isAC)?.monthlyRate || 0} onChange={(value) => setPrice(category, false, value)}/>
        </article>)}</div>
        <div className="mt-4 flex flex-col justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center"><p className="text-xs text-slate-500">These are base monthly prices per bed. Resident stays keep their agreed fee.</p><button onClick={save} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><Check size={16}/>{saving ? "Saving prices…" : "Save prices"}</button></div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-lg font-bold text-slate-950">Rooms in {hostel?.name}</h2><p className="mt-1 text-xs text-slate-500">Price shown is the current base price per bed.</p></div><label className="relative block sm:w-60"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search room number" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"/></label></div>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{["Room", "Sharing type", "Air conditioning", "Beds", "Monthly price"].map((item) => <th key={item} className="px-3 py-3 font-semibold">{item}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{roomRates.map((room) => {const rate=rates.find((item)=>item.capacity===room.capacity&&item.isAC===room.isAC&&item.rateCategory===(room.rateCategory||"STANDARD"));return <tr key={room.id}><td className="px-3 py-3 font-semibold">{room.roomNumber}</td><td className="px-3 py-3">{categories.find((item) => item.capacity === room.capacity && item.rateCategory === (room.rateCategory||"STANDARD"))?.title || `${room.capacity} sharing`}</td><td className="px-3 py-3"><span className={`rounded-md px-2 py-1 text-xs font-medium ${room.isAC ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{room.isAC ? "AC" : "Non-AC"}</span></td><td className="px-3 py-3 text-slate-600">{room.beds.length}</td><td className="px-3 py-3 font-semibold">{money(rate?.monthlyRate || 0)} <span className="text-xs font-normal text-slate-500">{rate?.pricingUnit==="PER_ROOM"?"per room":"per bed"}</span></td></tr>})}{!roomRates.length && <tr><td colSpan={5} className="px-3 py-10 text-center text-sm text-slate-500">No matching rooms.</td></tr>}</tbody></table></div>
      </section>
      <section className="flex gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4"><Info size={20} className="mt-0.5 shrink-0 text-blue-600"/><div><h2 className="text-sm font-semibold text-slate-900">How room prices work</h2><p className="mt-1 text-xs leading-5 text-slate-600">Set a monthly rate for each sharing type and AC option. New resident registrations can use the relevant rate. If you agree on a different amount, staff can enter the agreed monthly fee for that resident.</p></div></section>
    </>}
  </div></div>;
}

function initialize(existing: Rate[]): Rate[] { return categories.flatMap((category) => [true, false].map((isAC) => ({ capacity: category.capacity, isAC, rateCategory: category.rateCategory, pricingUnit: category.unit, monthlyRate: existing.find((rate) => rate.capacity === category.capacity && rate.isAC === isAC && rate.rateCategory === category.rateCategory)?.monthlyRate || 0 }))); }
function RateInput({ label, icon, value, unit, onChange }: { label: string; icon: ReactNode; value: number; unit: string; onChange: (value: string) => void }) { return <label className="mt-3 block"><span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">{icon}{label} <span className="font-normal text-slate-400">· {unit === "PER_ROOM" ? "per room" : "per bed"}/month</span></span><span className="flex items-center rounded-lg border border-slate-200 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"><IndianRupee size={14} className="text-slate-400"/><input type="number" min="0" value={value || ""} onChange={(event) => onChange(event.target.value)} placeholder="Enter monthly price" className="w-full bg-transparent py-2.5 pl-2 text-sm font-semibold outline-none"/></span></label>; }
