"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, LockKeyhole } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to sign in.");
      if (result.data?.user?.role === "CUSTOMER") {
        await fetch("/api/auth/logout", { method: "POST" });
        throw new Error("This sign-in is for hostel staff. Resident self-service is planned for Phase 2.");
      }
      router.replace("/admin"); router.refresh();
    } catch (err: any) { setError(err.message || "Unable to sign in."); }
    finally { setLoading(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 text-slate-900">
    <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
      <div className="mb-7 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-700 text-white"><Building2 size={21}/></span><span><span className="block text-sm font-bold text-slate-950">Hostel manager</span><span className="mt-0.5 block text-xs text-slate-500">Multi-location operations</span></span></div>
      <h1 className="text-xl font-bold tracking-tight text-slate-950">Staff sign in</h1><p className="mt-1.5 text-sm text-slate-600">Sign in to manage residents, beds, and hostel locations.</p>
      {error && <p role="alert" className="mt-5 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">{error}</p>}
      <form onSubmit={signIn} className="mt-6 space-y-4">
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-700">Email address</span><input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@hostel.com" className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"/></label>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-700">Password</span><span className="relative block"><LockKeyhole size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className="w-full rounded-md border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"/></span></label>
        <button disabled={loading} className="w-full rounded-md bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50">{loading ? "Signing in…" : "Sign in"}</button>
      </form>
      <p className="mt-6 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">Need access? Ask the hostel owner or administrator to create your staff account.</p>
    </section>
  </main>;
}
