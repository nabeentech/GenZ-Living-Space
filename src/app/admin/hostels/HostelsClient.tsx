"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, Layers3, MapPin, Minus, Plus, X } from "lucide-react";

const fieldClass = "w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100";
type RoomMix = { capacity: number; isAC: boolean; roomCount: number };
type FloorPlan = { floorNumber: number; roomTypes: RoomMix[] };
const newFloor = (floorNumber: number): FloorPlan => ({ floorNumber, roomTypes: [1,2,3,4].flatMap((capacity) => [false,true].map((isAC) => ({ capacity, isAC, roomCount: 0 }))) });

export default function HostelsClient({ initialHostels }: { initialHostels: any[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingHostel, setEditingHostel] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [layoutHostel, setLayoutHostel] = useState<any>(null);
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [layoutBusy, setLayoutBusy] = useState(false);

  async function addHostel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch(editingHostel ? `/api/admin/hostels/${editingHostel.id}` : "/api/admin/hostels", { method: editingHostel ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not add hostel");
      setOpen(false); setMessage(editingHostel ? "Hostel details updated." : "Hostel added."); setEditingHostel(null); router.refresh();
    } catch (err: any) { setError(err.message || "Could not add hostel"); }
    finally { setBusy(false); }
  }

  async function setActive(hostel: any) {
    setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/hostels/${hostel.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !hostel.active }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not update hostel");
      setMessage(`${hostel.name} ${hostel.active ? "deactivated" : "activated"}.`); router.refresh();
    } catch (err: any) { setError(err.message || "Could not update hostel"); }
  }

  async function openFloorLayout(hostel: any) {
    setError(""); setLayoutHostel(hostel); setFloorPlans([]); setLayoutBusy(true);
    try {
      const response = await fetch(`/api/admin/hostels/${hostel.id}/floors`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not load floor layout");
      setFloorPlans(result.floors);
    } catch (err: any) { setError(err.message || "Could not load floor layout"); setLayoutHostel(null); }
    finally { setLayoutBusy(false); }
  }

  async function saveFloorLayout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!layoutHostel) return;
    setError(""); setLayoutBusy(true);
    try {
      const response = await fetch(`/api/admin/hostels/${layoutHostel.id}/floors`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ floors: floorPlans }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not save floor layout");
      setLayoutHostel(null); setMessage(result.message); router.refresh();
    } catch (err: any) { setError(err.message || "Could not save floor layout"); }
    finally { setLayoutBusy(false); }
  }

  return <div className="-m-4 min-h-full bg-slate-50 p-4 text-slate-900 sm:-m-6 sm:p-6 lg:-m-8 lg:p-8"><div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Locations</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Hostels</h1><p className="mt-1 text-sm text-slate-600">Manage every property and location under your operation.</p></div><button onClick={() => { setError(""); setEditingHostel(null); setOpen(true); }} className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800"><Plus size={17}/>Add hostel</button></header>
    {message && <p role="status" className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><Check size={16}/>{message}</p>}{error && !open && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{initialHostels.map((hostel) => { const rooms = hostel.rooms.length; const beds = hostel.rooms.flatMap((room: any) => room.beds); const available = beds.filter((bed: any) => bed.status === "AVAILABLE").length; return <article key={hostel.id} className={`rounded-lg border bg-white p-4 shadow-sm ${hostel.active ? "border-slate-200" : "border-slate-200 opacity-75"}`}><div className="flex items-start justify-between gap-3"><div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-700"><Building2 size={18}/></span><div><h2 className="text-sm font-semibold text-slate-900">{hostel.name}</h2><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin size={13}/>{hostel.city}, {hostel.state}</p></div></div><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${hostel.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{hostel.active ? "Active" : "Inactive"}</span></div><div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 rounded-md border border-slate-200 py-2 text-center"><SmallStat label="Rooms" value={rooms}/><SmallStat label="Vacant beds" value={available}/><SmallStat label="Residents" value={hostel.residentStays.length}/></div><p className="mt-3 truncate text-xs text-slate-500">{hostel.address}</p><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => openFloorLayout(hostel)} className="inline-flex items-center justify-center gap-1 rounded-md border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"><Layers3 size={14}/>Floors & rooms</button><button onClick={() => { setEditingHostel(hostel); setError(""); setOpen(true); }} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Edit details</button><button onClick={() => setActive(hostel)} className="col-span-2 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">{hostel.active ? "Deactivate hostel" : "Activate hostel"}</button></div></article>; })}
      {initialHostels.length === 0 && <div className="col-span-full rounded-lg border border-dashed border-slate-300 bg-white px-5 py-12 text-center"><Building2 className="mx-auto text-slate-400" size={24}/><p className="mt-2 text-sm font-semibold text-slate-800">No hostels set up</p><p className="mt-1 text-xs text-slate-500">Add a hostel location to begin.</p></div>}
    </section>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4"><section role="dialog" aria-modal="true" aria-labelledby="hostel-dialog-title" className="my-5 w-full max-w-xl rounded-lg bg-white shadow-xl"><div className="flex items-start justify-between border-b border-slate-200 px-5 py-4"><div><h2 id="hostel-dialog-title" className="text-lg font-bold text-slate-950">{editingHostel ? "Edit hostel details" : "Add a hostel"}</h2><p className="mt-1 text-xs text-slate-500">Property location and contact details.</p></div><button aria-label="Close" onClick={() => { setOpen(false); setEditingHostel(null); }} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"><X size={18}/></button></div><form key={editingHostel?.id || "new-hostel"} onSubmit={addHostel} className="space-y-3 p-5">{error && <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}<FormField label="Hostel name"><input required name="name" defaultValue={editingHostel?.name || ""} className={fieldClass}/></FormField><div className="grid gap-3 sm:grid-cols-2"><FormField label="City"><input required name="city" defaultValue={editingHostel?.city || ""} className={fieldClass}/></FormField><FormField label="State"><input required name="state" defaultValue={editingHostel?.state || ""} className={fieldClass}/></FormField></div><div className="grid gap-3 sm:grid-cols-2"><FormField label="Postal code"><input required name="postalCode" defaultValue={editingHostel?.postalCode || ""} className={fieldClass}/></FormField><FormField label="Contact phone"><input required name="contactPhone" type="tel" defaultValue={editingHostel?.contactPhone || ""} className={fieldClass}/></FormField></div><FormField label="Full address"><textarea required name="address" rows={2} defaultValue={editingHostel?.address || ""} className={fieldClass}/></FormField><FormField label="Contact email"><input required name="contactEmail" type="email" defaultValue={editingHostel?.contactEmail || ""} className={fieldClass}/></FormField><div className="flex justify-end gap-2 border-t border-slate-200 pt-4"><button type="button" onClick={() => { setOpen(false); setEditingHostel(null); }} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button><button disabled={busy} className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-50">{busy ? "Saving…" : editingHostel ? "Save changes" : "Add hostel"}</button></div></form></section></div>}
    {layoutHostel && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4"><section role="dialog" aria-modal="true" aria-labelledby="layout-title" className="my-5 w-full max-w-4xl rounded-xl bg-white shadow-xl"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 id="layout-title" className="text-lg font-bold text-slate-950">Floors & room mix</h2><p className="mt-1 text-xs text-slate-500">{layoutHostel.name} · Set room counts by sharing type and AC option on every floor.</p></div><button aria-label="Close" onClick={()=>setLayoutHostel(null)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"><X size={18}/></button></div><form onSubmit={saveFloorLayout} className="p-5">{error&&<p role="alert" className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}{layoutBusy&&!floorPlans.length?<p className="py-10 text-center text-sm text-slate-500">Loading floor layout…</p>:<><div className="max-h-[58vh] space-y-4 overflow-y-auto">{floorPlans.map((floor,index)=><div key={floor.floorNumber} className="rounded-lg border border-slate-200 p-4"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-slate-900">{floorName(index+1)}</h3><button type="button" disabled={floorPlans.length===1} onClick={()=>setFloorPlans((prev)=>prev.slice(0,-1))} title="Remove top floor" className="rounded-md p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-30"><Minus size={17}/></button></div><div className="overflow-x-auto"><table className="w-full min-w-[430px] text-sm"><thead><tr className="text-left text-xs text-slate-500"><th className="pb-2">Sharing type</th><th className="w-32 pb-2">Non-AC rooms</th><th className="w-32 pb-2">AC rooms</th></tr></thead><tbody>{[1,2,3,4].map((capacity)=><tr key={capacity} className="border-t border-slate-100"><td className="py-2 font-medium">{["","Single","Double","Triple","Four sharing"][capacity]}</td>{[false,true].map((isAC)=>{const mixIndex=floor.roomTypes.findIndex((type)=>type.capacity===capacity&&type.isAC===isAC);const mix=floor.roomTypes[mixIndex];return <td key={String(isAC)} className="py-2 pr-2"><input aria-label={`${capacity} share ${isAC?"AC":"Non-AC"} rooms on ${floorName(index+1)}`} type="number" min="0" max="100" value={mix?.roomCount??0} onChange={(event)=>setFloorPlans((prev)=>prev.map((item,i)=>i===index?{...item,roomTypes:item.roomTypes.map((type,j)=>j===mixIndex?{...type,roomCount:Number(event.target.value)}:type)}:item))} className={fieldClass}/></td>})}</tr>)}</tbody></table></div><p className="mt-2 text-xs text-slate-500">{floor.roomTypes.reduce((sum,item)=>sum+item.roomCount,0)} rooms total</p></div>)}</div><button type="button" disabled={floorPlans.length>=20} onClick={()=>setFloorPlans((prev)=>[...prev,newFloor(prev.length+1)])} className="mt-3 inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Plus size={15}/>Add floor</button><p className="mt-4 rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">You can mix single, double, triple and four-share rooms on the same floor. Saving creates rooms and beds to match. Reductions are blocked when rooms have residents, bookings or unavailable beds.</p><div className="mt-4 flex justify-end gap-2 border-t border-slate-200 pt-4"><button type="button" onClick={()=>setLayoutHostel(null)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button><button disabled={layoutBusy} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{layoutBusy?"Saving…":"Save floor layout"}</button></div></>}</form></section></div>}
  </div></div>;
}

function SmallStat({ label, value }: { label: string; value: number }) { return <div className="px-2"><p className="text-sm font-semibold text-slate-900">{value}</p><p className="mt-0.5 text-[10px] text-slate-500">{label}</p></div>; }
function FormField({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-700">{label}<span className="ml-0.5 text-rose-600">*</span></span>{children}</label>; }
function floorName(floor:number){if(floor===1)return "Ground floor";const n=floor-1;const suffix=n%10===1&&n%100!==11?"st":n%10===2&&n%100!==12?"nd":n%10===3&&n%100!==13?"rd":"th";return `${n}${suffix} floor`;}
