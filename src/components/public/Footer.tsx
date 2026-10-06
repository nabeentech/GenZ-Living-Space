import React from "react";
import Link from "next/link";
import { MapPin, Phone, Mail, ShieldCheck } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-[#07090E] text-slate-400 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800/60">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <span className="font-extrabold text-xl tracking-tight text-white">
                GenZ <span className="text-indigo-400">Living Space</span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Find Your Space. Live Your Way. Designed specifically for builders, coders, artists, and creators looking for premium coliving, gigabit speeds, and vibrant community.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>Biometric Security • 24/7 Wardens • Verified Community</span>
            </div>
          </div>

          {/* The 2 Properties */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
              Our 2 Properties
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/hostels/madhapur-01-hyd" className="hover:text-indigo-400 transition">
                  Madhapur - 01
                </Link>
              </li>
              <li>
                <Link href="/hostels/madhapur-02-hyd" className="hover:text-indigo-400 transition">
                  Madhapur - 02
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
              Explore
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/hostels" className="hover:text-indigo-400 transition">
                  Browse All Rooms
                </Link>
              </li>
              <li>
                <Link href="/#amenities" className="hover:text-indigo-400 transition">
                  Creator Pods & Amenities
                </Link>
              </li>
              <li>
                <Link href="/dashboard/support" className="hover:text-indigo-400 transition">
                  Resident Support Desk
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-indigo-400 transition">
                  Staff & Admin Portal
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-indigo-400 transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-indigo-400 transition">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-indigo-400 transition">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
              Central Desk
            </h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 text-slate-300">
                <Phone className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>+91 98765 43210</span>
              </li>
              <li className="flex items-center gap-2 text-slate-300">
                <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>hello@genzlivingspace.com</span>
              </li>
              <li className="flex items-start gap-2 text-slate-400 text-xs">
                <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>Madhapur - HYD, Telangana</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} GenZ Living Space Hospitality Pvt. Ltd. All rights reserved.</p>
          <a 
            href="https://www.nabeenmultimedia.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-slate-500 hover:text-slate-400 transition-colors"
          >
            Designed and Developed by NabeenMultimedia
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
