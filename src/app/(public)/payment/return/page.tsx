"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import Button from "@/components/ui/Button";
import { CheckCircle2, XCircle, Clock, ArrowRight, RefreshCw, ShieldCheck } from "lucide-react";

function ReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const merchantOrderId = searchParams.get("merchantOrderId");

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"COMPLETED" | "PENDING" | "FAILED" | "ERROR">("PENDING");
  const [message, setMessage] = useState("Verifying payment with PhonePe...");
  const [bookingId, setBookingId] = useState<string | null>(null);

  useEffect(() => {
    if (!merchantOrderId) {
      setLoading(false);
      setStatus("ERROR");
      setMessage("Missing order reference in return URL.");
      return;
    }

    let intervalId: any = null;
    let attempts = 0;
    const maxAttempts = 5;

    async function checkStatus() {
      try {
        const res = await fetch(`/api/payments/status?merchantOrderId=${encodeURIComponent(merchantOrderId!)}`);
        const data = await res.json();

        if (data.success && data.state === "COMPLETED") {
          clearInterval(intervalId);
          setStatus("COMPLETED");
          setMessage("Payment received and booking confirmed!");
          setBookingId(data.bookingId);
          setLoading(false);

          // Auto-redirect to confirmation ticket after 2 seconds
          setTimeout(() => {
            router.replace(`/confirmation?bookingId=${encodeURIComponent(data.bookingId)}&payment=success`);
          }, 2000);
          return;
        }

        if (data.state === "FAILED") {
          clearInterval(intervalId);
          setStatus("FAILED");
          setMessage(data.message || "Payment was declined or failed.");
          setBookingId(data.bookingId || null);
          setLoading(false);
          return;
        }

        // If PENDING, retry up to maxAttempts
        attempts++;
        if (attempts >= maxAttempts) {
          clearInterval(intervalId);
          setStatus("PENDING");
          setMessage("Your payment is still being processed by PhonePe. Your booking hold remains active.");
          setBookingId(data.bookingId || null);
          setLoading(false);
        }
      } catch (err: any) {
        clearInterval(intervalId);
        setStatus("ERROR");
        setMessage("Unable to verify payment status. Please check your dashboard.");
        setLoading(false);
      }
    }

    checkStatus();
    intervalId = setInterval(checkStatus, 3000);

    return () => clearInterval(intervalId);
  }, [merchantOrderId, router]);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <div className="max-w-md w-full glass-panel p-8 sm:p-10 rounded-3xl border border-slate-800 bg-[#111827]/95 text-center shadow-2xl space-y-6">
          {loading && (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
              <h2 className="text-2xl font-black text-white">Verifying Payment</h2>
              <p className="text-sm text-slate-400">{message}</p>
              <div className="pt-2 flex items-center justify-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>PhonePe Secure 256-bit Encryption</span>
              </div>
            </div>
          )}

          {!loading && status === "COMPLETED" && (
            <div className="space-y-5 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-glow">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-3 py-1 rounded-full">
                  Payment Confirmed
                </span>
                <h2 className="text-2xl font-black text-white mt-3">You're All Set!</h2>
                <p className="text-sm text-slate-300 mt-1">{message}</p>
              </div>

              <div className="pt-2">
                {bookingId ? (
                  <Link href={`/confirmation?bookingId=${encodeURIComponent(bookingId)}`}>
                    <Button variant="glow" size="lg" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                      View Booking & QR Pass
                    </Button>
                  </Link>
                ) : (
                  <Link href="/dashboard">
                    <Button variant="glow" size="lg" className="w-full">
                      Go to Dashboard
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}

          {!loading && status === "PENDING" && (
            <div className="space-y-5">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-amber-400 bg-amber-950/70 border border-amber-500/30 px-3 py-1 rounded-full">
                  Confirmation Pending
                </span>
                <h2 className="text-2xl font-black text-white mt-3">Processing Payment</h2>
                <p className="text-sm text-slate-400 mt-1">{message}</p>
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <Link href="/dashboard">
                  <Button variant="glow" size="md" className="w-full">
                    Check in Dashboard
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" size="sm" className="w-full">
                    Return to Home
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {!loading && (status === "FAILED" || status === "ERROR") && (
            <div className="space-y-5">
              <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-rose-400 bg-rose-950/70 border border-rose-500/30 px-3 py-1 rounded-full">
                  Payment Incomplete
                </span>
                <h2 className="text-2xl font-black text-white mt-3">Payment Failed</h2>
                <p className="text-sm text-slate-400 mt-1">{message}</p>
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <Link href="/dashboard">
                  <Button variant="glow" size="md" className="w-full">
                    Retry from Dashboard
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" size="sm" className="w-full">
                    Return to Home
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function PhonePeReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center text-white">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      }
    >
      <ReturnContent />
    </Suspense>
  );
}
