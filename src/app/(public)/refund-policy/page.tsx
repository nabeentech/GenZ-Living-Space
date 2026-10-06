import React from "react";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";

export const metadata = {
  title: "Refund & Cancellation Policy | GenZ Living Space",
  description: "Cancellation, refund, and long-stay notice rules for GenZ Living Space bookings.",
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1 py-12 lg:py-20">
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <header className="space-y-3">
            <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">Legal</span>
            <h1 className="text-4xl sm:text-5xl font-black text-white">Refund &amp; Cancellation Policy</h1>
            <p className="text-sm text-slate-400">Effective date: September 6, 2026</p>
          </header>

          <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-[#111827]/80 space-y-8 text-sm text-slate-300 leading-relaxed">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">1. Standard booking cancellations</h2>
              <p>For bookings shorter than 28 nights, the refund estimate is based on the time remaining before check-in:</p>
              <ul className="list-disc pl-5 mt-3 space-y-1">
                <li>7 or more days before check-in: 100% of the paid amount is eligible for refund.</li>
                <li>3 to 6 days before check-in: 50% of the paid amount is eligible for refund.</li>
                <li>Less than 3 days before check-in: no refund is normally eligible.</li>
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">2. Long-stay bookings</h2>
              <p>Bookings of 28 nights or more are long-stay reservations. They require one month notice for cancellation. Customers cannot cancel these bookings directly from the dashboard; an administrator must review and process the request. The reserved bed remains unavailable for other bookings until the administrator releases or updates the reservation.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">3. Temporary payment holds</h2>
              <p>During checkout, a selected bed may be held for up to 15 minutes. If payment is not completed within that window, the hold expires and the booking is cancelled automatically without a refund because no payment was captured.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">4. Approved refunds</h2>
              <p>Eligible refunds are queued for review and are returned through the original payment method where possible. Processing times depend on the payment provider and banking network. Gateway fees, service fees, security deposits, or additional charges may be treated separately where permitted by law and the booking details.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">5. Admin cancellations and exceptions</h2>
              <p>Authorized staff may approve exceptions for duplicate bookings, property closure, operational relocation, verified emergencies, or other documented reasons. The final refund amount and reason will be recorded in the booking and audit history.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">6. Checkout charges</h2>
              <p>Charges for damages, lost keycards, laundry, food, late checkout, or other services are not automatically refundable after they have been accepted and recorded at checkout. Disputes should be raised with the Central Desk before departure where possible.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">7. Requesting help</h2>
              <p>Contact hello@genzlivingspace.com or +91 98765 43210 with your booking reference, reason, and supporting information. Requests are reviewed against the booking record and this policy.</p>
            </div>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  );
}
