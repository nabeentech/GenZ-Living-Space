"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import Button from "@/components/ui/Button";
import GoogleSignInButton from "@/components/public/GoogleSignInButton";
import { Sparkles, Lock, Mail, ArrowRight } from "lucide-react";

// Maps a user's role to the landing page they should see right after login.
// CUSTOMER falls through to the default "/dashboard" route.
const ROLE_REDIRECTS: Record<string, string> = {
  RECEPTIONIST: "/admin/receptionist",
  PROPERTY_MANAGER: "/admin/manager",
  SUPER_ADMIN: "/admin",
  FINANCE: "/admin",
  HOUSEKEEPING: "/admin",
  SUPPORT_STAFF: "/admin",
};

export default function LoginPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        setError("Google sign-in could not be completed. Please try again or use your password.");
      }
    }
  }, []);

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

      const role = json.data?.user?.role as string | undefined;
      // Staff accounts always enter their operations workspace, even when arriving
      // through a customer booking link.
      router.push((role && ROLE_REDIRECTS[role]) || nextPath || "/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
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

            {/* Fast 1-Click Google Sign-In */}
            <div className="space-y-4">
              <GoogleSignInButton nextPath={nextPath} />

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-[#111827] px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider relative shrink-0">
                  or sign in with email
                </span>
              </div>
            </div>

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

            <div className="text-center text-xs text-slate-400">
              Don&apos;t have an account yet?{" "}
              <Link
                href={nextPath ? `/auth/register?next=${encodeURIComponent(nextPath)}` : "/auth/register"}
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
