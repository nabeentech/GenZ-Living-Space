import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import HeroCarouselSection from "@/components/public/HeroCarouselSection";
import WhyUs from "@/components/public/WhyUs";
import AmenitiesGrid from "@/components/public/AmenitiesGrid";
import HostelGallerySection from "@/components/public/HostelGallerySection";
import Testimonials from "@/components/public/Testimonials";
import FAQAccordion from "@/components/public/FAQAccordion";
import Button from "@/components/ui/Button";
import { Sparkles, ArrowRight, ShieldCheck, Flame, Compass, Coffee } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getGalleryCategories } from "@/lib/gallery-categories";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSessionUser();
  if (user && user.role !== "CUSTOMER") redirect("/admin");

  // Fetch CMS content and Gallery images for homepage
  const [cmsContent, galleryImages, categories] = await Promise.all([
    prisma.websiteContent.findUnique({
      where: { sectionKey: "hero" },
    }),
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
      take: 12,
    }),
    getGalleryCategories(),
  ]);

  const formattedGallery = galleryImages.map((img) => ({
    ...img,
    src: img.imageUrl || `/api/gallery/image/${img.id}`,
  }));

  let heroData = {
    badge: "India's #1 Gen-Z Living Experience",
    headline: "More Than a Stay. A Better Way to Live.",
    subheadline: "Premium coliving, ultra-fast fiber, creative workspaces, and vibrant community living across 4 hand-curated hostel sanctuaries in Madhapur.",
  };

  if (cmsContent?.contentJson) {
    try {
      const parsed = JSON.parse(cmsContent.contentJson);
      heroData = { ...heroData, ...parsed };
    } catch {
      // Use defaults if JSON parse fails
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col">
      <Navbar user={user} />

      <main className="flex-1">
        {/* HERO SECTION WITH AUTO-SCROLLING GALLERY CAROUSEL */}
        <HeroCarouselSection
          galleryImages={formattedGallery}
          badge={heroData.badge}
          subheadline={heroData.subheadline}
        />

        {/* WHY GENZ SECTION */}
        <WhyUs />

        {/* AMENITIES SECTION */}
        <AmenitiesGrid />

        {/* HOSTEL GALLERY VISUAL TOUR */}
        <HostelGallerySection initialImages={formattedGallery} categories={categories} />

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
                  <Link href="/hostels/genz-colive-pg-guest-rooms">
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
