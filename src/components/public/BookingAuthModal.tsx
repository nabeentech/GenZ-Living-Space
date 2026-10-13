"use client";

import React, { useState } from "react";
import Button from "@/components/ui/Button";
import CustomSelect from "@/components/ui/CustomSelect";
import GoogleSignInButton from "@/components/public/GoogleSignInButton";
import {
  X,
  Mail,
  Lock,
  User,
  Phone,
  Sparkles,
  AlertCircle,
  LogIn,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

interface BookingAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
  hostelName?: string;
  bedNumber?: string;
  roomTypeName?: string;
}

export const BookingAuthModal: React.FC<BookingAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  hostelName,
  bedNumber,
  roomTypeName,
}) => {
  const [mode, setMode] = useState<"login" | "register">("login");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Register form state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regGender, setRegGender] = useState("MALE");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail.trim().toLowerCase(),
          password: loginPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Invalid email or password");
      }

      // Fetch full profile (includes phone & gender)
      const profileRes = await fetch("/api/auth/me");
      const profileData = await profileRes.json();
      const user = profileData?.user || data.data.user;

      window.dispatchEvent(new Event("auth-change"));
      onSuccess(user);
      onClose();
    } catch (err: any) {
      setLoginError(err.message || "Sign in failed. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    setRegLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName.trim(),
          email: regEmail.trim().toLowerCase(),
          phone: regPhone.trim(),
          password: regPassword,
          gender: regGender,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Could not create account");
      }

      // Fetch full profile
      const profileRes = await fetch("/api/auth/me");
      const profileData = await profileRes.json();
      const user = profileData?.user || data.data.user;

      window.dispatchEvent(new Event("auth-change"));
      onSuccess(user);
      onClose();
    } catch (err: any) {
      setRegError(err.message || "Registration failed. Please try again.");
    } finally {
      setRegLoading(false);
    }
  };

  const handleDemoFill = () => {
    setLoginEmail("sameer@gmail.com");
    setLoginPassword("Customer@123");
    setLoginError("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#0F172A] border border-indigo-500/40 rounded-3xl shadow-2xl shadow-indigo-950/60 overflow-hidden text-slate-100 max-h-[92vh] flex flex-col">
        {/* Header decoration */}
        <div className="p-6 pb-4 border-b border-slate-800 bg-slate-900/60 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Bed Allocation Pill */}
          {bedNumber && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                Holding Bed {bedNumber} {roomTypeName ? `• ${roomTypeName}` : ""}{" "}
                {hostelName ? `at ${hostelName}` : ""}
              </span>
            </div>
          )}

          <h3 className="text-2xl font-black text-white">
            {mode === "login" ? "Welcome Back to GenZ" : "Create Resident Account"}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {mode === "login"
              ? "Sign in to auto-fill your details and finalize your bed allocation."
              : "Register in 30 seconds to access your resident portal and instant QR check-in pass."}
          </p>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 mt-4">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setLoginError("");
              }}
              className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                mode === "login"
                  ? "bg-indigo-600 text-white shadow-glow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setRegError("");
              }}
              className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                mode === "register"
                  ? "bg-indigo-600 text-white shadow-glow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Quick 1-Click Google Sign-In */}
          <div className="space-y-3">
            <GoogleSignInButton
              label={mode === "login" ? "Continue with Google" : "Sign up with Google"}
              nextPath={typeof window !== "undefined" ? window.location.pathname + window.location.search : "/book"}
            />
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-[#0F172A] px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider relative shrink-0">
                {mode === "login" ? "or sign in with password" : "or register with email"}
              </span>
            </div>
          </div>

          {mode === "login" ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. sameer@gmail.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Quick Demo Credentials */}
              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">
                  Testing demo account?
                </span>
                <button
                  type="button"
                  onClick={handleDemoFill}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer"
                >
                  Fill Demo: Sameer
                </button>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="glow"
                  size="lg"
                  className="w-full"
                  isLoading={loginLoading}
                  rightIcon={<LogIn className="w-4 h-4" />}
                >
                  Sign In & Proceed to Details
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {regError && (
                <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{regError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1.5">
                  Full Name (as per Govt ID) *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sameer Deshmukh"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1.5">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="name@email.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1.5">
                    WhatsApp Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1.5">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="Min 6 characters"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1.5">
                    Gender
                  </label>
                  <CustomSelect
                    value={regGender}
                    onValueChange={setRegGender}
                    triggerClassName="rounded-xl border border-slate-700 bg-slate-900 py-3 px-3 text-sm"
                    options={[
                      { value: "MALE", label: "Male" },
                      { value: "FEMALE", label: "Female" },
                      { value: "OTHER", label: "Other / Non-Binary" },
                    ]}
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="glow"
                  size="lg"
                  className="w-full"
                  isLoading={regLoading}
                  rightIcon={<UserPlus className="w-4 h-4" />}
                >
                  Create Account & Continue
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Guarantee */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Your allocated bed is held during this session. No brokerage or hidden fees.</span>
        </div>
      </div>
    </div>
  );
};

export default BookingAuthModal;
