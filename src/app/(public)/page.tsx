import React from "react";
import Link from "next/link";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import HeroSearch from "@/components/public/HeroSearch";
import PropertyCard from "@/components/public/PropertyCard";
import WhyUs from "@/components/public/WhyUs";
import AmenitiesGrid from "@/components/public/AmenitiesGrid";
import Testimonials from "@/components/public/Testimonials";
import FAQAccordion from "@/components/public/FAQAccordion";
import Button from "@/components/ui/Button";
import { Sparkles, ArrowRight, ShieldCheck, Flame, Compass, Coffee } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSessionUser();

  // Fetch CMS content for homepage
  const cmsContent = await prisma.websiteContent.findUnique({
    where: { sectionKey: "hero" },
  });

  let heroData = {
    badge: "Most Luxury and Comfortable Colive PG in Hyderabad",
    headline: "Find Your Space. Live Your Way.",
    subheadline: "Premium coliving, ultra-fast fiber, creative workspaces, and vibrant community living.",
  };

  if (cmsContent?.contentJson) {
    try {
      const parsed = JSON.parse(cmsContent.contentJson);
      heroData = { ...heroData, ...parsed };
    } catch {
      // Use defaults if JSON parse fails
    }
  }

  // Fetch all active properties from database
  let hostels: any[] = [];
  try {
    hostels = await prisma.hostel.findMany({
      where: { active: true },
      include: {
        rooms: {
          include: {
            roomType: true,
            beds: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("Database fetch error, using fallback static data:", error);
  }

  // Fallback if database hasn't been seeded yet
  if (!hostels || hostels.length === 0) {
    hostels = [
      {
        slug: "madhapur-01-hyd",
        name: "GenZ Colive & PG Guest Rooms",
        tagline: "Premium Coliving & Guest Rooms",
        city: "Madhapur - HYD",
        address: "Hitech City Road, Madhapur",
        rating: 4.9,
        coverImage: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&auto=format&fit=crop&q=80",
        startingPrice: 599,
        availableBeds: 50,
      },
    ];
  } else {
    // Transform from DB
    hostels = hostels.map((h) => {
      let minPrice = 599;
      let totalAvail = 0;
      
      // Get minimum price from all room types (use Non-AC daily rate)
      const seenRoomTypes = new Set<string>();
      h.rooms?.forEach((r: any) => {
        if (r.roomType && !seenRoomTypes.has(r.roomType.id)) {
          seenRoomTypes.add(r.roomType.id);
          // Use Non-AC daily rate, fall back to AC rate, then basePrice, then default
          const roomPrice = r.roomType.pricePerDayNonAC || 
                           r.roomType.pricePerDayAC || 
                           r.roomType.basePrice || 
                           599;
          if (roomPrice < minPrice) {
            minPrice = roomPrice;
          }
        }
        r.beds?.forEach((b: any) => {
          if (b.status === "AVAILABLE") totalAvail++;
        });
      });
      return {
        slug: h.slug,
        name: h.name,
        tagline: h.tagline,
        city: h.city,
        address: h.address,
        rating: h.rating,
        coverImage: h.coverImage,
        startingPrice: minPrice,
        availableBeds: totalAvail > 0 ? totalAvail : 12,
      };
    });
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col">
      <Navbar user={user} />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative pt-6 pb-24 lg:pt-10 lg:pb-32 overflow-hidden">
          {/* Subtle Ambient Glow Gradients */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-indigo-600/15 via-purple-600/10 to-transparent blur-[120px] pointer-events-none" />
          <div className="absolute top-1/3 -left-48 w-96 h-96 bg-pink-500/10 blur-[120px] rounded-full pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* Top Pill */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-indigo-500/30 text-xs font-semibold text-indigo-300 shadow-glow">
                <Flame className="w-3.5 h-3.5 text-pink-400" />
                <span>{heroData.badge}</span>
              </div>
            </div>

            {/* Main Headline */}
            <div className="text-center max-w-4xl mx-auto space-y-6">
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] text-white">
                {heroData.headline}
              </h1>
              <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
                {heroData.subheadline}
              </p>
            </div>

            {/* Interactive Availability Search Bar */}
            <div className="mt-12 max-w-5xl mx-auto">
              <HeroSearch />
            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-16 grid grid-cols-3 gap-4 max-w-4xl mx-auto justify-center">
              <div className="glass-panel p-4 rounded-2xl text-center border border-slate-800/80 bg-[#111827]/60">
                <span className="block text-2xl sm:text-3xl font-black text-cyan-400">1 Gbps</span>
                <span className="text-xs text-slate-400 font-medium">Fiber Optic Wi-Fi</span>
              </div>
              <div className="glass-panel p-4 rounded-2xl text-center border border-slate-800/80 bg-[#111827]/60">
                <span className="block text-2xl sm:text-3xl font-black text-amber-300">4.9 ★</span>
                <span className="text-xs text-slate-400 font-medium">Average Guest Rating</span>
              </div>
              <div className="glass-panel p-4 rounded-2xl text-center border border-slate-800/80 bg-[#111827]/60">
                <span className="block text-2xl sm:text-3xl font-black text-pink-400">10,000+</span>
                <span className="text-xs text-slate-400 font-medium">Happy Nomads</span>
              </div>
            </div>
          </div>
        </section>

        {/* PROPERTY SECTION */}
        <section id="hostels" className="py-24 bg-[#07090E] border-t border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
              <div className="space-y-3">
                <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400 bg-indigo-950/60 border border-indigo-500/30 px-3.5 py-1.5 rounded-full">
                  Our Premium Property
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                  GenZ <span className="gradient-text-primary">Colive & PG</span>
                </h2>
                <p className="text-slate-400 text-sm sm:text-base max-w-xl">
                  Premium coliving experience with gigabit fiber, creator pods, and vibrant community living.
                </p>
              </div>

              <Link href="/hostels">
                <Button variant="outline" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  View All Rooms & Pricing
                </Button>
              </Link>
            </div>

            {/* Grid of the Property */}
            <div className="grid grid-cols-1 gap-6">
              {hostels.map((h) => (
                <PropertyCard
                  key={h.slug}
                  slug={h.slug}
                  name={h.name}
                  tagline={h.tagline}
                  city={h.city}
                  address={h.address}
                  rating={h.rating}
                  coverImage={h.coverImage}
                  startingPrice={h.startingPrice}
                  availableBeds={h.availableBeds}
                />
              ))}
            </div>
          </div>
        </section>

        {/* WHY GENZ SECTION */}
        <WhyUs />

        {/* AMENITIES SECTION */}
        <AmenitiesGrid />

        {/* TESTIMONIALS SECTION */}
        <Testimonials />

        {/* FAQ ACCORDION SECTION */}
        <FAQAccordion />

        {/* BOTTOM CTA BANNER */}
        <section className="py-20 relative overflow-hidden bg-gradient-to-b from-[#0B0F19] to-[#07090E]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="glass-panel p-8 sm:p-14 rounded-3xl border border-indigo-500/30 bg-gradient-to-tr from-indigo-950/60 via-purple-950/40 to-slate-900/80 text-center relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/20 blur-[100px] pointer-events-none" />
              <div className="relative z-10 space-y-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  Instant Confirmation
                </span>
                <h2 className="text-3xl sm:text-5xl font-black text-white">
                  Ready to experience GenZ Living Space?
                </h2>
                <p className="text-slate-300 max-w-xl mx-auto text-sm sm:text-base">
                  Lock your bed now. Receive your digital QR pass instantly and check in seamlessly at reception.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                  <Link href="/hostels">
                    <Button variant="glow" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                      Explore Our Hostels
                    </Button>
                  </Link>
                  <Link href="/auth/register">
                    <Button variant="outline" size="lg">
                      Create Resident Account
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
