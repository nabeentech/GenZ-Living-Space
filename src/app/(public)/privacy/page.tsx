import React from "react";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import { ShieldCheck, Building2, Utensils, Phone, Mail, UserCheck, Lock, EyeOff, FileText } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | GenZ Living Space – GenZ Colive PG and Guest Rooms",
  description: "Official Privacy Policy for GenZ Living Space (GenZ Colive PG and Guest Rooms) in Madhapur, Hyderabad, Telangana. FSSAI Reg: 23626028006147.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col selection:bg-indigo-500/30">
      <Navbar />

      <main className="flex-1 py-12 lg:py-20">
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">

          {/* Header */}
          <header className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Lock className="w-3.5 h-3.5" />
              <span>Data Protection &amp; Privacy</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Privacy Policy
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

          {/* Legal Summary Banner */}
          <div className="p-6 rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-[#111827] to-[#0B0F19] shadow-xl space-y-4">
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
              At <strong className="text-white">GenZ Living Space</strong> (operated under the business name{" "}
              <strong className="text-white">GenZ Colive PG and Guest Rooms</strong>), we are committed to respecting
              and protecting your privacy. This Privacy Policy describes how we collect, store, handle, and protect
              your personal data when you visit our website, book accommodation, stay at our properties, or utilize
              our dining and amenities.
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              By accessing our website or booking accommodation, you acknowledge and agree to the information practices
              described herein, in accordance with applicable Indian data protection and hospitality regulations.
            </p>
          </div>

          {/* Quick Property & Ownership Highlight Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl border border-slate-800 bg-[#101726]/80 text-xs sm:text-sm">
            <div className="space-y-1">
              <span className="text-slate-400 text-xs uppercase font-bold tracking-wider">Business Entity</span>
              <p className="text-white font-semibold">GenZ Colive PG and Guest Rooms</p>
              <p className="text-slate-300 text-xs">Brand Name: GenZ Living Space</p>
              <p className="text-slate-400 text-xs">Property Type: Co-living PG Accommodation &amp; Guest Rooms</p>
            </div>
            <div className="space-y-1 sm:border-l sm:border-slate-800 sm:pl-4">
              <span className="text-slate-400 text-xs uppercase font-bold tracking-wider">Management &amp; Food Safety</span>
              <p className="text-white font-semibold">Owner: KANDULA VEERAIAH</p>
              <p className="text-emerald-400 font-medium text-xs flex items-center gap-1">
                <Utensils className="w-3.5 h-3.5" /> FSSAI Registration No: 23626028006147
              </p>
              <p className="text-slate-400 text-xs">Jurisdiction: Telangana, India</p>
            </div>
          </div>

          {/* Policy Sections */}
          <section className="glass-panel p-6 sm:p-10 rounded-3xl border border-slate-800/90 bg-[#101626]/80 space-y-10 text-sm text-slate-300 leading-relaxed shadow-2xl">

            {/* Section 1 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  1
                </span>
                Information We Collect
              </h2>
              <p>We collect information necessary for bookings, identity verification, resident administration, security, and legal compliance:</p>
              <ul className="list-disc pl-6 space-y-2 text-slate-300">
                <li>
                  <strong className="text-white">Personal Contact Details:</strong> Full name, telephone number, WhatsApp contact, and email address.
                </li>
                <li>
                  <strong className="text-white">Government Identification:</strong> Valid government-issued photo identity documents (such as Aadhaar, Passport, Voter ID, or Driving Licence) as mandated by hospitality laws, guest registry standards, and local police verification guidelines.
                </li>
                <li>
                  <strong className="text-white">Booking and Stay Data:</strong> Check-in and check-out dates, room and bed allocations, sharing preferences, duration of stay, and assigned digital access credentials or RFID card records.
                </li>
                <li>
                  <strong className="text-white">Payment and Transaction Records:</strong> Transaction identifiers, payment timestamps, receipt records, security deposit records, and invoice details. We do not store raw card numbers or confidential banking passwords on our servers.
                </li>
                <li>
                  <strong className="text-white">Food Service and Dietary Information:</strong> Meal plan selections, reported food allergies, dietary restrictions, or meal preference disclosures under our FSSAI-compliant kitchen operations.
                </li>
                <li>
                  <strong className="text-white">Premises Access and Visitor Logs:</strong> Entry and exit timestamps, visitor log records, emergency contact details, and customer support correspondence.
                </li>
              </ul>
            </div>

            {/* Section 2 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  2
                </span>
                How We Use Your Information
              </h2>
              <p>We use collected data strictly for operational, legal, and safety purposes:</p>
              <ul className="list-disc pl-6 space-y-1.5 text-slate-300">
                <li>To verify identity and confirm accommodation bookings and bed allocations.</li>
                <li>To issue digital check-in passes, QR codes, and keycard credentials.</li>
                <li>To administer food services and accommodate communicated dietary or allergy preferences under FSSAI Registration No. 23626028006147.</li>
                <li>To process rent, guest-room charges, security deposits, and legally eligible refunds.</li>
                <li>To maintain campus safety, emergency response readiness, fire-safety procedures, and access control.</li>
                <li>To communicate important property updates, house rules, maintenance notices, and emergency alerts.</li>
                <li>To fulfill statutory accounting, taxation, and law-enforcement compliance requirements under Indian and Telangana laws.</li>
              </ul>
            </div>

            {/* Section 3 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  3
                </span>
                CCTV Surveillance &amp; Premises Safety
              </h2>
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Strict Privacy Safeguards on Security Cameras</span>
                </div>
                <p className="text-slate-300 text-xs sm:text-sm">
                  In compliance with Section 11 of our Terms and Conditions, closed-circuit television (CCTV) cameras
                  and electronic access control systems are installed strictly in permitted common and access-control
                  areas—such as building entrances, main lobbies, corridors, stairways, and outdoor premises—to protect
                  resident safety, staff, and property.
                </p>
                <p className="text-emerald-400 text-xs sm:text-sm font-semibold flex items-center gap-2">
                  <EyeOff className="w-4 h-4 shrink-0" />
                  Cameras are NEVER installed in private dorm rooms, private bedrooms, bathrooms, or washroom facilities.
                </p>
              </div>
            </div>

            {/* Section 4 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  4
                </span>
                Payment Processing and Financial Data
              </h2>
              <p>
                Payments made online are processed through trusted third-party payment gateway providers. Sensitive
                financial data, such as complete card numbers, CVVs, or internet banking passwords, is transmitted
                directly to the PCI-DSS compliant payment gateways and is not stored or hosted on our application servers.
              </p>
              <p className="text-slate-400">
                Offline payments made via UPI, bank transfer, or at the Central Desk are recorded for accounting, tax,
                and invoice generation purposes only.
              </p>
            </div>

            {/* Section 5 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  5
                </span>
                Information Sharing and Third Parties
              </h2>
              <p className="text-slate-300">
                We <strong className="text-white">do not sell, rent, or trade</strong> your personal information to
                third parties for marketing or advertising purposes. We may share limited information solely under the
                following conditions:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-slate-300">
                <li>
                  <strong className="text-white">Authorized Staff &amp; Service Providers:</strong> Front desk personnel, security wardens, housekeeping supervisors, and technology hosting providers who require data strictly to operate our facilities.
                </li>
                <li>
                  <strong className="text-white">Government &amp; Law Enforcement:</strong> Competent judicial or administrative authorities, local police departments, and statutory bodies when legally required or mandated under Indian laws.
                </li>
                <li>
                  <strong className="text-white">Emergency Services:</strong> Medical personnel, hospital staff, or fire officials in situations involving immediate health, medical emergency, or life-safety risks.
                </li>
              </ul>
            </div>

            {/* Section 6 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  6
                </span>
                Resident Conduct &amp; Respect for Co-living Privacy
              </h2>
              <p>
                As part of our community standards and Section 15(4) of the Terms and Conditions, all residents and
                guests are strictly prohibited from publishing, broadcasting, or sharing other residents&apos; personal
                information, private details, photographs, or video recordings without their prior explicit consent.
              </p>
              <p className="text-slate-400">
                Any breach of co-resident privacy is treated as a serious violation of community house rules.
              </p>
            </div>

            {/* Section 7 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  7
                </span>
                Data Storage, Security and Retention
              </h2>
              <p>
                We employ technical, administrative, and physical security measures to protect personal data from
                unauthorized access, loss, alteration, or misuse. Information is stored securely with access restricted
                by role-based privileges.
              </p>
              <p className="text-slate-400">
                We retain resident information, billing histories, and verification documents for as long as necessary
                to manage the booking relationship, resolve disputes, satisfy statutory accounting obligations, and
                comply with applicable Indian record-retention laws.
              </p>
            </div>

            {/* Section 8 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  8
                </span>
                Your Choices &amp; Rights
              </h2>
              <p>
                You may request access to, correction of, or updates to your personal records by contacting the Central
                Desk. Please note that certain government records, identification copies, and accounting invoices must be
                retained in accordance with mandatory legal, taxation, and police verification obligations.
              </p>
            </div>

            {/* Section 9 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  9
                </span>
                Policy Updates and Governing Law
              </h2>
              <p>
                We may revise this Privacy Policy from time to time to reflect operational changes, technological
                advancements, or statutory updates. The &ldquo;Last Updated&rdquo; date at the top indicates when changes
                take effect.
              </p>
              <p className="text-slate-400">
                This Privacy Policy is governed by the laws of India and the jurisdiction of Telangana courts.
              </p>
            </div>

            {/* Section 10 */}
            <div className="space-y-6">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  10
                </span>
                Contact Information &amp; Data Grievances
              </h2>
              <p>
                If you have questions, concerns, or requests regarding this Privacy Policy or your personal information,
                please contact the management:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl border border-indigo-500/30 bg-[#161F36]/60">
                <div className="space-y-2">
                  <div className="flex items-start gap-2.5">
                    <Building2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Business &amp; Property</p>
                      <p className="text-white font-semibold">GenZ Colive PG and Guest Rooms</p>
                      <p className="text-xs text-indigo-300">Brand: GenZ Living Space</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 pt-2">
                    <UserCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Owner</p>
                      <p className="text-white font-semibold">KANDULA VEERAIAH</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2.5">
                    <Utensils className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">FSSAI Registration</p>
                      <p className="text-emerald-400 font-semibold font-mono text-xs">23626028006147</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 pt-2">
                    <Phone className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Central Desk</p>
                      <div className="flex flex-col gap-0.5">
                        <a href="tel:+919652037700" className="text-white font-semibold hover:text-indigo-300 transition-colors">
                          +91 96520 37700
                        </a>
                        <a href="tel:+919652037744" className="text-slate-300 text-xs hover:text-white transition-colors">
                          +91 96520 37744
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 pt-1">
                    <Mail className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Email</p>
                      <a href="mailto:genzlivingspace@gmail.com" className="text-white font-semibold hover:text-indigo-300 transition-colors">
                        genzlivingspace@gmail.com
                      </a>
                    </div>
                  </div>
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
