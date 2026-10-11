"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, BedDouble, Check, CircleDollarSign, Plus, Search, Users, X } from "lucide-react";
import { billingStatus } from "@/lib/resident-stays";

type HostelOption = { id: string; name: string; city: string; roomRates: { capacity: number; isAC: boolean; rateCategory: string; pricingUnit: string; monthlyRate: number }[]; rooms: { id: string; roomNumber: string; floor: number; capacity: number; isAC: boolean; rateCategory: string; roomType: { name: string }; beds: { id: string; bedNumber: string; tier: string }[] }[] };

const inputClass = "w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100";
const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";
const today = new Date().toISOString().slice(0, 10);

export default function ResidentsClient({ initialStays, hostels, canRegister = true, canVacate = true, initialHostelId = "all", initialRoomId = "", initialBedId = "", initialSearch = "", initiallyOpen = false, initialFeeStayId = "" }: { initialStays: any[]; hostels: HostelOption[]; canRegister?: boolean; canVacate?: boolean; initialHostelId?: string; initialRoomId?: string; initialBedId?: string; initialSearch?: string; initiallyOpen?: boolean; initialFeeStayId?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialSearch);
  const [hostelFilter, setHostelFilter] = useState(initialHostelId);
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [showRegistration, setShowRegistration] = useState(initiallyOpen);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [feeStay, setFeeStay] = useState<any>(() => initialStays.find((stay) => stay.id === initialFeeStayId && stay.status === "ACTIVE") || null);
  const [feeMethod, setFeeMethod] = useState("CASH");
  const [feeNote, setFeeNote] = useState("");
  const [selectedHostel, setSelectedHostel] = useState(initialHostelId === "all" ? "" : initialHostelId);
  const [selectedRoom, setSelectedRoom] = useState(initialRoomId);
  const [formBusy, setFormBusy] = useState(false);
  const [firstFeeCollected, setFirstFeeCollected] = useState(true);
  const [firstFeeMethod, setFirstFeeMethod] = useState("CASH");

  const activeStays = initialStays.filter((stay) => stay.status === "ACTIVE");
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const dueCount = activeStays.filter((stay) => new Date(stay.nextDueAt) <= todayStart).length;
  const availableCount = hostels.reduce((total, hostel) => total + hostel.rooms.reduce((rooms, room) => rooms + room.beds.length, 0), 0);
  const filtered = useMemo(() => initialStays.filter((stay) => {
    const matchesStatus = statusFilter === "all" || stay.status === statusFilter;
    const matchesHostel = hostelFilter === "all" || stay.hostelId === hostelFilter;
    const haystack = [stay.resident.name, stay.resident.phone, stay.resident.email, stay.resident.govtIdNumber, stay.hostel.name, stay.room.roomNumber, stay.bed.bedNumber].join(" ").toLowerCase();
    return matchesStatus && matchesHostel && haystack.includes(query.trim().toLowerCase());
  }), [initialStays, statusFilter, hostelFilter, query]);

  const chosenHostel = hostels.find((hostel) => hostel.id === selectedHostel);
  const chosenRoom = chosenHostel?.rooms.find((room) => room.id === selectedRoom);

  async function submitRegistration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage(""); setFormBusy(true);
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const response = await fetch("/api/admin/residents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, firstFeeCollected }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not register resident");
      setShowRegistration(false); setMessage("Resident registered and bed allocated."); router.refresh();
    } catch (err: any) { setError(err.message || "Could not register resident"); }
    finally { setFormBusy(false); }
  }

  async function recordFee() {
    if (!feeStay) return;
    setBusyId(feeStay.id); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/residents/${feeStay.id}/fee`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method: feeMethod, note: feeNote }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not record fee");
      setFeeStay(null); setFeeNote(""); setMessage("Fee collection recorded. The next due date has been updated."); router.refresh();
    } catch (err: any) { setError(err.message || "Could not record fee"); }
    finally { setBusyId(""); }
  }

  async function vacate(stay: any) {
    if (!window.confirm(`Vacate ${stay.resident.name} from ${stay.hostel.name}, room ${stay.room.roomNumber}, bed ${stay.bed.bedNumber}?`)) return;
    setBusyId(stay.id); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/residents/${stay.id}/vacate`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not vacate resident");
      setMessage(`${stay.resident.name} has been marked as vacated.`); router.refresh();
    } catch (err: any) { setError(err.message || "Could not vacate resident"); }
    finally { setBusyId(""); }
  }

  return <div className="-m-4 min-h-full bg-slate-50 p-4 text-slate-900 sm:-m-6 sm:p-6 lg:-m-8 lg:p-8"><div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Hostel operations</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Residents</h1><p className="mt-1 text-sm text-slate-600">Register residents, allocate beds, and track monthly fee dates across your hostels.</p></div>
      {canRegister && <button onClick={() => { setError(""); setShowRegistration(true); }} className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-800"><Plus size={17}/> Register resident</button>}
    </header>

    {message && <div role="status" className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><Check size={16}/>{message}</div>}
    {error && !showRegistration && <div role="alert" className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><AlertCircle size={16}/>{error}</div>}

    <section className="grid gap-3 sm:grid-cols-3" aria-label="Resident summary">
      <Summary icon={<Users size={18}/>} label="Current residents" value={activeStays.length} detail="Across all active hostels" tone="indigo"/>
      <Summary icon={<AlertCircle size={18}/>} label="Fees due" value={dueCount} detail="Due today or overdue" tone={dueCount ? "amber" : "green"}/>
      <Summary icon={<BedDouble size={18}/>} label="Vacant beds" value={availableCount} detail="Available for allocation" tone="slate"/>
    </section>

    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div><h2 className="text-sm font-semibold text-slate-900">Resident register</h2><p className="mt-0.5 text-xs text-slate-500">Search resident, ID, hostel, room, or bed.</p></div>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="relative"><span className="sr-only">Search residents</span><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search residents" className={`${inputClass} pl-9`}/></label>
          <select aria-label="Filter by hostel" value={hostelFilter} onChange={(e) => setHostelFilter(e.target.value)} className={inputClass}><option value="all">All hostels</option>{hostels.map((hostel) => <option value={hostel.id} key={hostel.id}>{hostel.name} · {hostel.city}</option>)}</select>
          <select aria-label="Filter resident status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}><option value="ACTIVE">Current residents</option><option value="all">All stays</option><option value="VACATED">Vacated residents</option></select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[940px] text-left text-sm">
          <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Resident</th><th className="px-4 py-3">Hostel · bed</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3">Monthly fee</th><th className="px-4 py-3">Next due</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((stay) => {
              const billing = billingStatus(new Date(stay.nextDueAt));
              const active = stay.status === "ACTIVE";
              return <tr key={stay.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3"><div className="font-semibold text-slate-900">{stay.resident.name}</div><div className="mt-0.5 text-xs text-slate-500">{stay.resident.phone}{stay.resident.govtIdNumber ? ` · ${stay.resident.govtIdType || "ID"} ${maskId(stay.resident.govtIdNumber)}` : ""}</div></td>
                <td className="px-4 py-3"><div className="font-medium text-slate-800">{stay.hostel.name} · {stay.hostel.city}</div><div className="mt-0.5 text-xs text-slate-500">Room {stay.room.roomNumber} · {stay.bed.bedNumber} · {stay.room.roomType.name}</div></td>
                <td className="px-4 py-3 text-slate-700">{formatDate(stay.joinedAt)}</td>
                <td className="px-4 py-3"><div className="font-medium text-slate-800">₹{Number(stay.monthlyFee).toLocaleString("en-IN")}</div><div className="mt-0.5 text-[11px] text-slate-500">{stay.feeReceipts[0] ? `Last collected ${formatDate(stay.feeReceipts[0].receivedAt)} · ${stay.feeReceipts[0].method}` : "No fee recorded yet"}</div></td>
                <td className="px-4 py-3"><div className="text-slate-800">{formatDate(stay.nextDueAt)}</div>{active && <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${billing.tone === "overdue" || billing.tone === "due" ? "bg-rose-50 text-rose-700" : billing.tone === "soon" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>{billing.label}{billing.tone === "overdue" ? ` · ${billing.days}d` : ""}</span>}{!active && <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Vacated {stay.vacatedAt ? formatDate(stay.vacatedAt) : ""}</span>}</td>
                <td className="px-4 py-3"><div className="flex justify-end gap-2">{active && <><button disabled={busyId === stay.id} onClick={() => { setFeeStay(stay); setFeeMethod("CASH"); setFeeNote(""); }} className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50">Record fee</button>{canVacate && <button disabled={busyId === stay.id} onClick={() => vacate(stay)} className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-rose-300 hover:text-rose-700 disabled:opacity-50">Vacate</button>}</>}</div></td>
              </tr>;
            })}
            {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-14 text-center"><div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500"><Users size={19}/></div><p className="mt-3 text-sm font-semibold text-slate-800">No residents found</p><p className="mt-1 text-xs text-slate-500">Change the filters or register your first resident.</p></td></tr>}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">Showing {filtered.length} of {initialStays.length} stays</div>
    </section>

    {showRegistration && <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/45 p-3 sm:p-6" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowRegistration(false); }}><section role="dialog" aria-modal="true" aria-labelledby="register-title" className="my-4 w-full max-w-3xl rounded-lg bg-white shadow-xl">
      <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6"><div><p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">New occupancy</p><h2 id="register-title" className="mt-1 text-lg font-bold text-slate-950">Register resident & allocate bed</h2><p className="mt-1 text-xs text-slate-500">Add their details, choose a vacant bed, and set the monthly fee.</p></div><button aria-label="Close" onClick={() => setShowRegistration(false)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"><X size={18}/></button></div>
      <form onSubmit={submitRegistration} className="space-y-5 p-5 sm:p-6">
        {error && <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">{error}</div>}
        <div><h3 className="text-sm font-semibold text-slate-900">Resident details</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Full name" required><input name="name" required className={inputClass} placeholder="Resident full name"/></Field>
          <Field label="Phone number" required><input name="phone" required type="tel" className={inputClass} placeholder="Mobile number"/></Field>
          <Field label="Email (optional)"><input name="email" type="email" className={inputClass} placeholder="resident@example.com"/></Field>
          <Field label="Gender"><select name="gender" className={inputClass}><option value="">Select</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></select></Field>
          <Field label="Government ID type"><select name="govtIdType" className={inputClass}><option value="AADHAAR">Aadhaar</option><option value="PASSPORT">Passport</option><option value="DRIVING_LICENSE">Driving licence</option><option value="VOTER_ID">Voter ID</option></select></Field>
          <Field label="Government ID number" required><input name="govtIdNumber" required className={inputClass} placeholder="Enter ID number"/></Field>
          <Field label="Date of birth"><input name="dateOfBirth" type="date" className={inputClass}/></Field>
          <Field label="Emergency contact"><input name="emergencyContact" className={inputClass} placeholder="Name and phone number"/></Field>
          <Field label="Address" className="sm:col-span-2"><textarea name="address" rows={2} className={inputClass} placeholder="Resident address"/></Field>
        </div></div>
        <div className="border-t border-slate-200 pt-4"><h3 className="text-sm font-semibold text-slate-900">Hostel & bed</h3><div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field label="Hostel" required><select name="hostelId" required value={selectedHostel} onChange={(e) => { setSelectedHostel(e.target.value); setSelectedRoom(""); }} className={inputClass}><option value="">Choose hostel</option>{hostels.map((hostel) => <option key={hostel.id} value={hostel.id}>{hostel.name} · {hostel.city}</option>)}</select></Field>
          <Field label="Room" required><select name="roomId" required value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)} disabled={!chosenHostel} className={inputClass}><option value="">Choose room</option>{chosenHostel?.rooms.filter((room) => room.beds.length).map((room) => <option key={room.id} value={room.id}>Room {room.roomNumber} · {room.roomType.name}</option>)}</select></Field>
          <Field label="Vacant bed" required><select name="bedId" required disabled={!chosenRoom} defaultValue={initialBedId} className={inputClass}><option value="">Choose bed</option>{chosenRoom?.beds.map((bed) => <option key={bed.id} value={bed.id}>{bed.bedNumber} · {bed.tier.replaceAll("_", " ").toLowerCase()}</option>)}</select></Field>
        </div>{chosenHostel && chosenHostel.rooms.every((room) => room.beds.length === 0) && <p className="mt-2 text-xs text-amber-800">This hostel has no vacant beds right now.</p>}</div>
        <div className="border-t border-slate-200 pt-4"><h3 className="text-sm font-semibold text-slate-900">Monthly fee</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Joining date" required><input name="joinedAt" required type="date" defaultValue={today} className={inputClass}/></Field>
          <Field label={`Monthly fee (₹${chosenRoom?.capacity === 1 ? " per room" : " per bed"})`} required><input key={selectedRoom} name="monthlyFee" required min="1" step="1" type="number" className={inputClass} defaultValue={chosenHostel?.roomRates.find((rate) => rate.capacity === chosenRoom?.capacity && rate.isAC === chosenRoom?.isAC && rate.rateCategory === chosenRoom?.rateCategory)?.monthlyRate || ""} placeholder="Set hostel price first"/></Field>
        </div><label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-md border border-slate-200 bg-slate-50 p-3"><input type="checkbox" checked={firstFeeCollected} onChange={(e) => setFirstFeeCollected(e.target.checked)} className="mt-0.5 accent-indigo-700"/><span><span className="block text-xs font-semibold text-slate-800">First month fee collected offline</span><span className="mt-0.5 block text-xs text-slate-500">Record the collection now; next fee is due on the monthly joining date.</span></span></label>{firstFeeCollected && <div className="mt-3 max-w-xs"><Field label="Payment method"><select name="firstFeeMethod" value={firstFeeMethod} onChange={(e) => setFirstFeeMethod(e.target.value)} className={inputClass}><option value="CASH">Cash</option><option value="UPI">UPI (collected in person)</option><option value="BANK_TRANSFER">Bank transfer</option><option value="OTHER">Other</option></select></Field></div>}</div>
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4"><button type="button" onClick={() => setShowRegistration(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button><button disabled={formBusy} type="submit" className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-50">{formBusy ? "Saving…" : "Register & allocate bed"}</button></div>
      </form>
    </section></div>}

    {feeStay && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"><section role="dialog" aria-modal="true" aria-labelledby="fee-title" className="w-full max-w-md rounded-lg bg-white shadow-xl"><div className="flex items-start justify-between border-b border-slate-200 px-5 py-4"><div><h2 id="fee-title" className="text-base font-bold text-slate-950">Record monthly fee</h2><p className="mt-1 text-xs text-slate-500">{feeStay.resident.name} · Due {formatDate(feeStay.nextDueAt)}</p></div><button aria-label="Close" onClick={() => setFeeStay(null)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"><X size={18}/></button></div><div className="space-y-4 p-5">{error && <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>}<div className="rounded-md bg-slate-50 p-3"><p className="text-xs text-slate-500">Amount to record</p><p className="mt-1 text-lg font-bold text-slate-900">₹{Number(feeStay.monthlyFee).toLocaleString("en-IN")}</p></div><Field label="Payment method"><select value={feeMethod} onChange={(e) => setFeeMethod(e.target.value)} className={inputClass}><option value="CASH">Cash</option><option value="UPI">UPI (collected in person)</option><option value="BANK_TRANSFER">Bank transfer</option><option value="OTHER">Other</option></select></Field><Field label="Note (optional)"><input value={feeNote} onChange={(e) => setFeeNote(e.target.value)} className={inputClass} placeholder="Receipt reference or note"/></Field><p className="text-xs text-slate-500">This records an offline collection and moves the next due date forward by one month.</p><div className="flex justify-end gap-2 border-t border-slate-200 pt-4"><button onClick={() => setFeeStay(null)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button><button disabled={busyId === feeStay.id} onClick={recordFee} className="inline-flex items-center gap-2 rounded-md bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-50"><CircleDollarSign size={16}/>{busyId === feeStay.id ? "Saving…" : "Mark fee collected"}</button></div></div></section></div>}
  </div></div>;
}

function Summary({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: number; detail: string; tone: string }) {
  const colors: Record<string, string> = { indigo: "bg-indigo-50 text-indigo-700", amber: "bg-amber-50 text-amber-700", green: "bg-emerald-50 text-emerald-700", slate: "bg-slate-100 text-slate-700" };
  return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between"><p className="text-xs font-medium text-slate-500">{label}</p><span className={`flex h-8 w-8 items-center justify-center rounded-md ${colors[tone]}`}>{icon}</span></div><p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>;
}

function Field({ label, required, className = "", children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return <label className={`block ${className}`}><span className={labelClass}>{label}{required && <span className="ml-0.5 text-rose-600">*</span>}</span>{children}</label>;
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function maskId(value: string) { const digits = value.replace(/\s/g, ""); return digits.length > 4 ? `${"•".repeat(Math.min(8, digits.length - 4))}${digits.slice(-4)}` : digits; }
