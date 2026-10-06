import React from "react";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";

export const metadata = {
  title: "Privacy Policy | GenZ Living Space",
  description: "How GenZ Living Space collects, uses, and protects resident information.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1 py-12 lg:py-20">
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <header className="space-y-3">
            <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">Legal</span>
            <h1 className="text-4xl sm:text-5xl font-black text-white">Privacy Policy</h1>
            <p className="text-sm text-slate-400">Effective date: September 6, 2026</p>
          </header>

          <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-[#111827]/80 space-y-8 text-sm text-slate-300 leading-relaxed">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">1. Information we collect</h2>
              <p>We collect information needed to manage reservations and provide a safe stay, including your name, email address, phone number, government ID details, booking dates, payment references, support requests, and check-in or check-out records.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">2. How we use information</h2>
              <p>We use this information to process bookings, confirm payments, issue invoices and QR passes, complete identity verification, manage rooms and beds, provide support, prevent fraud, maintain security, and meet applicable hospitality and accounting obligations.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">3. Payments</h2>
              <p>Payment details are processed through our payment provider or recorded by authorized staff for offline payments. We do not intentionally store full card numbers or payment authentication credentials on our application servers.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">4. Sharing and service providers</h2>
              <p>We may share limited information with payment providers, technology providers, property staff, support personnel, and authorities where required by law. We do not sell resident information.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">5. Retention and security</h2>
              <p>We retain booking, invoice, payment, identity, and audit information for as long as reasonably necessary for operations, legal compliance, dispute handling, and accounting. Access is restricted by role, and sensitive requests are logged.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">6. Your choices</h2>
              <p>You may request access to, correction of, or clarification about your personal information by contacting the Central Desk at hello@genzlivingspace.com. Some records may need to be retained where required by law or necessary to resolve a dispute.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">7. Updates</h2>
              <p>We may update this policy when our services, legal obligations, or data practices change. The effective date above will be updated when a new version is published.</p>
            </div>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  );
}
