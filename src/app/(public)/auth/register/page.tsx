"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import Button from "@/components/ui/Button";
import CustomSelect from "@/components/ui/CustomSelect";
import GoogleSignInButton from "@/components/public/GoogleSignInButton";
import { Sparkles, Lock, Mail, User, Phone, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState("MALE");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get("next") || "";
    if (value.startsWith("/") && !value.startsWith("//")) setNextPath(value);

    const err = params.get("error");
    if (err) {
      if (err === "google_not_configured") {
        setError("Google Sign-In is pending setup. Client ID & Secret must be added to .env.");
      } else if (err === "access_denied") {
        setError("Google sign-in was cancelled.");
      } else if (err === "invalid_oauth_state") {
        setError("Authentication session expired. Please try signing in with Google again.");
      } else if (err === "token_exchange_failed" || err === "userinfo_fetch_failed") {
        setError("Failed to verify Google account credentials. Please try again.");
      } else if (err === "email_not_provided") {
        setError("Your Google account did not share an email address.");
      } else {
        setError("Google sign-in could not be completed. Please try again or create an account below.");
      }
    }
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password, gender }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Registration failed");
      }

      router.push(nextPath || "/dashboard");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="glass-panel p-8 rounded-3xl border border-slate-800 bg-[#111827]/90 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-pink-500 flex items-center justify-center mx-auto shadow-glow">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-black text-white">
                Join GenZ Living Space
              </h1>
              <p className="text-xs text-slate-400">
                Create your resident profile for hassle-free bookings and fast QR check-in.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 font-medium">
                {error}
              </div>
            )}

            {/* Fast 1-Click Google Sign-Up */}
            <div className="space-y-4">
              <GoogleSignInButton label="Sign up with Google" nextPath={nextPath} />

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-[#111827] px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider relative shrink-0">
                  or register with email
                </span>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sameer Deshmukh"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

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
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                  Create Password
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

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                  Gender
                </label>
                <CustomSelect value={gender} onValueChange={setGender} options={[{ value: "MALE", label: "Male" }, { value: "FEMALE", label: "Female" }, { value: "OTHER", label: "Other" }]} triggerClassName="p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm focus:border-indigo-500" />
              </div>

              <Button
                type="submit"
                variant="glow"
                size="lg"
                isLoading={isLoading}
                className="w-full justify-center shadow-glow mt-2"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Create Free Account
              </Button>
            </form>

            <div className="text-center text-xs text-slate-400">
              Already have an account?{" "}
              <Link
                href={nextPath ? `/auth/login?next=${encodeURIComponent(nextPath)}` : "/auth/login"}
                className="text-indigo-400 font-bold hover:underline"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
