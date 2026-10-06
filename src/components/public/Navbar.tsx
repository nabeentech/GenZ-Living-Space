"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Compass, User, ShieldAlert } from "lucide-react";
import Button from "../ui/Button";

interface NavbarProps {
  user?: {
    name: string;
    email: string;
    role: string;
  } | null;
}

export const Navbar: React.FC<NavbarProps> = ({ user }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { label: "Why GenZ", href: "/#why-us" },
    { label: "Amenities", href: "/#amenities" },
    { label: "Community", href: "/#community" },
    { label: "FAQs", href: "/#faqs" },
  ];

  const isAdmin = user && user.role !== "CUSTOMER";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#0B0F19]/85 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex flex-col">
            <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5">
              GenZ <span className="text-indigo-400 font-semibold">Living Space</span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-pink-400 -mt-1">
              Madhapur - HYD
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-indigo-400 ${
                  isActive ? "text-indigo-400" : "text-slate-300"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right CTA & Account */}
        <div className="hidden md:flex items-center gap-3">
          {isAdmin && (
            <Link href="/admin">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-900 transition">
                <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
                Staff Portal
              </span>
            </Link>
          )}

          {user ? (
            <Link href="/dashboard">
              <span className="inline-flex items-center gap-2 text-sm font-medium px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-white transition">
                <User className="w-4 h-4 text-indigo-400" />
                <span>{user.name.split(" ")[0]}</span>
              </span>
            </Link>
          ) : (
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
          )}

          <Link href="/hostels">
            <Button variant="glow" size="sm" rightIcon={<Compass className="w-4 h-4" />}>
              Find A Bed
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-[#0B0F19] px-6 py-6 space-y-4 animate-in slide-in-from-top-4 duration-200">
          <div className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-base font-medium text-slate-200 hover:text-indigo-400 py-1"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-800 flex flex-col gap-3">
            {isAdmin && (
              <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="outline" size="md" className="w-full justify-center">
                  Staff Admin Portal
                </Button>
              </Link>
            )}

            {user ? (
              <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="outline" size="md" className="w-full justify-center">
                  My Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/auth/login" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="outline" size="md" className="w-full justify-center">
                  Sign In
                </Button>
              </Link>
            )}

            <Link href="/hostels" onClick={() => setIsMobileMenuOpen(false)}>
              <Button variant="glow" size="md" className="w-full justify-center">
                Explore Hostels & Book
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
