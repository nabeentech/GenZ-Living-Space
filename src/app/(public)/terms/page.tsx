import React from "react";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";

export const metadata = {
  title: "Terms & Conditions | GenZ Living Space",
  description: "Terms for booking and staying at GenZ Living Space properties in Madhapur HYD.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1 py-12 lg:py-20">
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <header className="space-y-3">
            <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">Legal</span>
            <h1 className="text-4xl sm:text-5xl font-black text-white">Terms &amp; Conditions</h1>
            <p className="text-sm text-slate-400">Effective date: September 6, 2026</p>
          </header>

          <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-[#111827]/80 space-y-8 text-sm text-slate-300 leading-relaxed">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">1. Booking agreement</h2>
              <p>By placing a booking, you confirm that the details provided are accurate, that you are authorized to use the payment method, and that you agree to these terms, the applicable property rules, and the displayed booking price.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">2. Reservation and payment</h2>
              <p>A selected bed may be held temporarily for up to 15 minutes during checkout. The reservation becomes confirmed only after successful payment verification. A confirmed booking is tied to the named guest and the allocated bed unless changed by authorized staff.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">3. Check-in requirements</h2>
              <p>Guests must present valid government identification matching the reservation. GenZ Living Space may refuse check-in where identity cannot be verified, payment is incomplete, the reservation is invalid, or property safety rules would be breached.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">4. Property rules</h2>
              <p>Guests must respect quiet hours, staff instructions, other residents, room capacity limits, security controls, and housekeeping requirements. Damage, lost keycards, late checkout, food, laundry, or other approved charges may be added to the booking.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">5. Changes and extensions</h2>
              <p>Extensions depend on bed availability and must be confirmed through the platform or authorized staff. A revised price and any additional payment will apply. GenZ Living Space may move a guest to another suitable bed when operationally necessary and will communicate material changes.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">6. Liability</h2>
              <p>Guests are responsible for their belongings, account credentials, and conduct. GenZ Living Space is not responsible for loss caused by a guest's failure to secure belongings or comply with property instructions, except where liability cannot legally be excluded.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">7. Suspension or termination</h2>
              <p>We may suspend an account, cancel a reservation, or require a guest to leave where there is fraud, non-payment, unsafe conduct, material rule violation, or a legal or operational requirement. Any refund will be handled under the applicable refund policy.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">8. Contact</h2>
              <p>Questions about a reservation or these terms can be sent to hello@genzlivingspace.com or the Central Desk at +91 98765 43210.</p>
            </div>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  );
}
