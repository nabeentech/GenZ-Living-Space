import React from "react";
import Link from "next/link";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import PropertyCard from "@/components/public/PropertyCard";
import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Sparkles, MapPin, Filter } from "lucide-react";

export const dynamic = "force-dynamic";

interface HostelsPageProps {
  searchParams: {
    city?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: string;
  };
}

export default async function HostelsPage({ searchParams }: HostelsPageProps) {
  const user = await getSessionUser();

  const where: any = { active: true };
  if (searchParams.city && searchParams.city !== "all") {
    where.city = { contains: searchParams.city };
  }

  const hostels = await prisma.hostel.findMany({
    where,
    include: {
      rooms: {
        include: {
          roomType: true,
          beds: true,
        },
      },
    },
  });

  const formattedHostels = hostels.map((h) => {
    let minPrice = 599;
    let totalAvail = 0;
    h.rooms?.forEach((r) => {
      if (r.roomType?.basePrice && r.roomType.basePrice < minPrice) {
        minPrice = r.roomType.basePrice;
      }
      r.beds?.forEach((b) => {
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
      availableBeds: totalAvail,
    };
  });

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 py-12 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
            <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400 bg-indigo-950/60 border border-indigo-500/30 px-3.5 py-1.5 rounded-full">
              Handcrafted Hospitality
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Our 2 Madhapur <span className="gradient-text-primary">Properties</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base">
              Explore each location's unique vibe, check real-time bed availability, and book directly with zero middleman markups.
            </p>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
            <Link
              href="/hostels"
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                !searchParams.city || searchParams.city === "all"
                  ? "bg-indigo-600 text-white shadow-glow"
                  : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              All 2 Properties (2)
            </Link>
            <Link
              href="/hostels?city=Madhapur%20-%20HYD"
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                searchParams.city === "Madhapur - HYD"
                  ? "bg-indigo-600 text-white shadow-glow"
                  : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              Madhapur - HYD (2)
            </Link>
          </div>

          {/* Hostels Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {formattedHostels.map((h) => (
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
      </main>

      <Footer />
    </div>
  );
}
