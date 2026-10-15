import React from "react";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import { ShieldCheck, Building2, Phone, Mail, Clock, RefreshCw, AlertCircle, FileText } from "lucide-react";

export const metadata = {
  title: "Refund & Cancellation Policy | GenZ Living Space – GenZ Colive PG and Guest Rooms",
  description: "Cancellation, refund eligibility, deposit settlements, and vacating notice terms for GenZ Living Space (GenZ Colive PG and Guest Rooms).",
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col selection:bg-indigo-500/30">
      <Navbar />

      <main className="flex-1 py-12 lg:py-20">
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">

          {/* Header */}
          <header className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Cancellation &amp; Settlement Rules</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Refund &amp; Cancellation Policy
            </h1>
            <p className="text-base sm:text-lg text-slate-300 font-medium">
              GenZ Living Space – GenZ Colive PG and Guest Rooms
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
              <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 font-semibold text-slate-300">
                Last Updated: 12 October 2026
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                FSSAI Reg: 23626028006147
              </span>
            </div>
          </header>

          {/* Policy Overview Banner */}
          <div className="p-6 rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-[#111827] to-[#0B0F19] shadow-xl space-y-4">
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
              This Refund &amp; Cancellation Policy governs reservations, deposits, advance rent settlements, and early
              vacating notices at <strong className="text-white">GenZ Living Space</strong> (operated under the name{" "}
              <strong className="text-white">GenZ Colive PG and Guest Rooms</strong>, Owner:{" "}
              <strong className="text-white">KANDULA VEERAIAH</strong>).
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              In accordance with Section 5 and Section 6 of our Terms and Conditions, all cancellation requests and
              settlement adjustments must be submitted through authorized communication channels and are processed
              in accordance with documented policies and applicable law.
            </p>
          </div>

          {/* Policy Breakdown */}
          <section className="glass-panel p-6 sm:p-10 rounded-3xl border border-slate-800/90 bg-[#101626]/80 space-y-10 text-sm text-slate-300 leading-relaxed shadow-2xl">

            {/* Section 1 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  1
                </span>
                Standard Short-Stay Bookings (Under 28 Nights)
              </h2>
              <p>For daily and short-stay reservations, refund eligibility is computed automatically based on the time remaining before scheduled check-in:</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30">
                  <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-400">7+ Days Prior</span>
                  <p className="text-xl font-black text-white mt-1">100% Refund</p>
                  <p className="text-xs text-slate-400 mt-1">Full refund of eligible paid accommodation amount.</p>
                </div>
                <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30">
                  <span className="text-xs uppercase font-extrabold tracking-wider text-amber-400">3 to 6 Days Prior</span>
                  <p className="text-xl font-black text-white mt-1">50% Refund</p>
                  <p className="text-xs text-slate-400 mt-1">50% of paid accommodation charges refunded.</p>
                </div>
                <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30">
                  <span className="text-xs uppercase font-extrabold tracking-wider text-rose-400">Under 3 Days</span>
                  <p className="text-xl font-black text-white mt-1">Non-Refundable</p>
                  <p className="text-xs text-slate-400 mt-1">No refund eligible due to last-minute bed hold.</p>
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  2
                </span>
                Long-Stay Bookings &amp; Early Vacating Notice
              </h2>
              <p>
                Bookings of 28 nights or longer represent monthly or extended coliving accommodation:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-slate-300">
                <li>
                  <strong className="text-white">Notice Period:</strong> Residents intending to vacate before the end of their agreed stay must provide at least <strong className="text-indigo-300">one month (30 days) advance written notice</strong> to the property management.
                </li>
                <li>
                  <strong className="text-white">Administrative Review:</strong> Long-stay cancellations require verification by the Central Desk to calculate pro-rata usage, utility settlements, and bed inventory release.
                </li>
                <li>
                  <strong className="text-white">Inventory Protection:</strong> The assigned bed remains reserved exclusively for the resident until management formally inspects and clears the checkout.
                </li>
              </ul>
            </div>

            {/* Section 3 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  3
                </span>
                Security Deposits &amp; Permissible Deductions
              </h2>
              <p>
                Any security deposit, advance payment, or refundable amount collected at admission will be settled upon check-out subject to the following rules:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-slate-300">
                <li>
                  Deductions from refundable deposits may be made for outstanding dues, damage to property, missing keys/appliances/equipment, or other documented and legally permissible charges.
                </li>
                <li>
                  Normal wear and tear is not penalized. Damage beyond ordinary wear and tear is charged at reasonable, documented replacement or repair costs.
                </li>
                <li>
                  Late-payment charges, if applicable, are communicated in advance.
                </li>
                <li>
                  Remaining deposit amounts are refunded promptly following room inspection and clearance.
                </li>
              </ul>
            </div>

            {/* Section 4 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  4
                </span>
                15-Minute Temporary Checkout Hold
              </h2>
              <p>
                During booking checkout, a selected bed is placed on temporary hold for up to 15 minutes to allow
                secure payment completion. If payment is not verified within 15 minutes, the hold expires automatically
                and the bed is released. No refund is due in this case as no payment was captured.
              </p>
            </div>

            {/* Section 5 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  5
                </span>
                Refund Processing and Timelines
              </h2>
              <p>
                Approved refunds are processed through the original payment method (or another mutually agreed channel).
                Turnaround timelines depend on the payment provider, UPI network, or the guest&apos;s receiving bank
                (typically 5 to 7 business days from date of approval).
              </p>
              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex items-start gap-3 text-xs sm:text-sm">
                <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-slate-200">
                  <strong className="text-white">Statutory Guarantee:</strong> As stated in Section 6(7) of our Terms
                  and Conditions, <em>no refund will be denied where a refund is legally required</em> under applicable
                  Indian or Telangana consumer regulations.
                </p>
              </div>
            </div>

            {/* Section 6 */}
            <div className="space-y-6">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  6
                </span>
                How to Request a Cancellation or Dispute
              </h2>
              <p>
                To initiate a cancellation, request a deposit settlement, or dispute a checkout deduction, please contact
                our Central Desk with your booking reference code:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl border border-indigo-500/30 bg-[#161F36]/60">
                <div className="space-y-2">
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Business &amp; Management</p>
                  <p className="text-white font-semibold">GenZ Colive PG and Guest Rooms</p>
                  <p className="text-xs text-slate-300">Owner: KANDULA VEERAIAH</p>
                  <p className="text-xs text-emerald-400">FSSAI Reg: 23626028006147</p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Contact Central Desk</p>
                  <div className="flex items-center gap-2 text-xs">
                    <Phone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <a href="tel:+919652037700" className="text-white font-semibold hover:text-indigo-300">
                      +91 96520 37700
                    </a>
                    <span className="text-slate-500">/</span>
                    <a href="tel:+919652037744" className="text-slate-300 hover:text-white">
                      +91 96520 37744
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <a href="mailto:genzlivingspace@gmail.com" className="text-white font-semibold hover:text-indigo-300">
                      genzlivingspace@gmail.com
                    </a>
                  </div>
                  <p className="text-[11px] text-slate-400">Madhapur - HYD, Telangana</p>
                </div>
              </div>
            </div>

          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}
