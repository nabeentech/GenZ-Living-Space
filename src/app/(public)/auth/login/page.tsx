"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import Button from "@/components/ui/Button";
import { Sparkles, Lock, Mail, ArrowRight, ShieldAlert, Check } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Invalid credentials");
      }

      if (json.data?.user?.role === "RECEPTIONIST") {
        router.push("/admin/receptionist");
      } else if (json.data?.user?.role === "PROPERTY_MANAGER") {
        router.push("/admin/manager");
      } else if (json.data?.user?.role !== "CUSTOMER") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md space-y-6">
          {/* Card */}
          <div className="glass-panel p-8 rounded-3xl border border-slate-800 bg-[#111827]/90 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-pink-500 flex items-center justify-center mx-auto shadow-glow">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-black text-white">
                Sign In to GenZ Space
              </h1>
              <p className="text-xs text-slate-400">
                Access your bookings, digital pass, and community benefits.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="glow"
                size="lg"
                isLoading={isLoading}
                className="w-full justify-center shadow-glow mt-2"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Sign In
              </Button>
            </form>

            {/* Quick Demo Fill Buttons */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block text-center">
                1-Click Demo Accounts
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => fillDemo("admin@genzlivingspace.com", "Admin@123")}
                  className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-indigo-500/30 text-indigo-300 font-medium text-left"
                >
                  <span className="font-bold block">Super Admin</span>
                  <span className="text-[10px] text-slate-400">Full platform OS</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo("reception@genzlivingspace.com", "Reception@123")}
                  className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-purple-500/30 text-purple-300 font-medium text-left"
                >
                  <span className="font-bold block">Receptionist</span>
                  <span className="text-[10px] text-slate-400">QR Check-in/out</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo("manager@genzlivingspace.com", "Manager@123")}
                  className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-pink-500/30 text-pink-300 font-medium text-left"
                >
                  <span className="font-bold block">Property Manager</span>
                  <span className="text-[10px] text-slate-400">Hostel ops</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo("sameer@gmail.com", "Customer@123")}
                  className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-emerald-500/30 text-emerald-300 font-medium text-left"
                >
                  <span className="font-bold block">Resident</span>
                  <span className="text-[10px] text-slate-400">Customer portal</span>
                </button>
              </div>
            </div>

            <div className="text-center text-xs text-slate-400">
              Don't have an account yet?{" "}
              <Link
                href="/auth/register"
                className="text-indigo-400 font-bold hover:underline"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
