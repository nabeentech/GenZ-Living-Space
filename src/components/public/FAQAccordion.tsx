"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FAQItem {
  q: string;
  a: string;
}

export const FAQAccordion: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FAQItem[] = [
    {
      q: "How does the booking and bed allocation work?",
      a: "You select your desired property from our 4 locations, pick your dates, choose a room type (e.g. 4-Bed Dorm or Private Studio), and choose your preferred bed (lower bunk, upper bunk, or private). When you checkout, a 15-minute temporary hold reserves your bed so no one else can book it while you finalize payment.",
    },
    {
      q: "Can I stay for monthly or long-term durations?",
      a: "Yes! We support Daily, Weekly (with automatic 10-15% discounts), and Monthly stays. Monthly stays come with special student & founder rates, a refundable security deposit, and digital rent invoices.",
    },
    {
      q: "How does Check-In work when I arrive at the hostel?",
      a: "As soon as your booking is confirmed, you get an instant digital pass with a unique QR code. When you arrive at reception, staff scan your QR code, verify your government ID (Aadhaar/Passport), hand you your biometric RFID keycard, and you're checked in within 30 seconds!",
    },
    {
      q: "What is your cancellation and refund policy?",
      a: "We offer flexible cancellations directly from your customer dashboard: cancellations made more than 7 days before check-in receive a 100% refund, cancellations between 3 to 7 days receive a 50% refund, and cancellations under 3 days are non-refundable. Refunds are tracked in your account and processed back to your original payment method.",
    },
    {
      q: "Is Wi-Fi fast enough for heavy remote tech work and calls?",
      a: "Absolutely. Both properties are equipped with dedicated commercial 1 Gbps optic fiber lines with automatic secondary backup ISP lines, low latency ping, and soundproof podcast/call booths on rooftops.",
    },
    {
      q: "Are the dorms gender-segregated or mixed?",
      a: "We offer Female-only dorms (with dedicated en-suite bathrooms and keypad access), Male dorms, Mixed social dorms, as well as 100% Private creator studios.",
    },
  ];

  return (
    <section id="faqs" className="py-24 bg-[#0B0F19]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14 space-y-3">
          <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400 bg-indigo-950/60 border border-indigo-500/30 px-3.5 py-1.5 rounded-full">
            Got Questions?
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Frequently Asked <span className="gradient-text-primary">Questions</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Everything you need to know about staying, working, and living at GenZ Living Space.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="glass-panel rounded-2xl border border-slate-800/80 bg-[#101626]/70 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 focus:outline-none"
                >
                  <span className="text-base font-semibold text-white">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-indigo-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQAccordion;
