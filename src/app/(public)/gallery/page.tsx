import React from "react";
import Link from "next/link";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import Button from "@/components/ui/Button";
import GalleryBrowser from "./GalleryBrowser";
import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Sparkles, Camera, ArrowRight, Compass } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Hostel Photo Gallery | GenZ Living Space Hyderabad",
  description:
    "Explore high-resolution authentic photos of our living pods, co-working lounges, panoramic rooftop café, and vibrant community spaces in Madhapur, Hyderabad.",
};

export default async function PublicGalleryPage() {
  const user = await getSessionUser();

  const [images, hostels] = await Promise.all([
    prisma.galleryImage.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        isFeatured: true,
        imageUrl: true,
        hostel: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
          },
        },
      },
      orderBy: [
        { isFeatured: "desc" },
        { sortOrder: "asc" },
        { createdAt: "desc" },
      ],
    }),
    prisma.hostel.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const formattedImages = images.map((img) => ({
    ...img,
    src: `/api/gallery/image/${img.id}`,
  }));

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 pb-20">
        {/* Header Hero */}
        <section className="relative pt-12 pb-14 overflow-hidden border-b border-slate-800/80">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-indigo-600/15 via-purple-600/10 to-transparent blur-[120px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-indigo-500/30 text-xs font-semibold text-indigo-300 shadow-glow">
              <Camera className="w-3.5 h-3.5 text-pink-400" />
              <span>Hostel Spaces & Visual Experience</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white">
              Hostel Photo <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">Gallery</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto">
              Explore authentic photos of our living pods, co-working terraces, gamer zones, and community spaces.
            </p>
          </div>
        </section>

        {/* Gallery Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <GalleryBrowser initialImages={formattedImages} hostels={hostels} />
        </div>

        {/* Bottom CTA Banner */}
        <section className="mt-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-indigo-500/30 bg-gradient-to-tr from-indigo-950/60 via-purple-950/40 to-slate-900/80 text-center relative overflow-hidden shadow-2xl">
            <div className="relative z-10 space-y-5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Experience It In Person
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-white">
                Like what you see? Book your space today.
              </h2>
              <p className="text-slate-300 max-w-lg mx-auto text-xs sm:text-sm">
                Reserve your pod or room in under 2 minutes. Instant digital QR pass on booking confirmation.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link href="/hostels/madhapur-01-hyd">
                  <Button variant="glow" size="lg" rightIcon={<Compass className="w-4 h-4" />}>
                    Find A Bed & Book Now
                  </Button>
                </Link>
                <Link href="/#why-us">
                  <Button variant="outline" size="lg">
                    Why Choose GenZ
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
