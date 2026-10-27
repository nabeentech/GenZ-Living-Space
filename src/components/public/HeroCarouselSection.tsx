"use client";

import React, { useState, useEffect } from "react";
import { Flame } from "lucide-react";
import HeroSearch from "./HeroSearch";

export interface HeroCarouselImage {
  id: string;
  src: string;
  title?: string;
  category?: string;
}

interface HeroCarouselSectionProps {
  galleryImages?: HeroCarouselImage[];
  badge?: string;
  subheadline?: string;
}

const defaultImages: HeroCarouselImage[] = [
  {
    id: "def-1",
    src: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1600&auto=format&fit=crop&q=80",
    title: "Rooftop Sunset Lounge & Terrace",
  },
  {
    id: "def-2",
    src: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1600&auto=format&fit=crop&q=80",
    title: "Twin Sharing Pod Sanctuary",
  },
  {
    id: "def-3",
    src: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1600&auto=format&fit=crop&q=80",
    title: "Chillout Common Lounge & Café",
  },
  {
    id: "def-4",
    src: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1600&auto=format&fit=crop&q=80",
    title: "Sun Deck & Outdoor Reflection Area",
  },
  {
    id: "def-5",
    src: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1600&auto=format&fit=crop&q=80",
    title: "Community Chef Bar & Dining Area",
  },
];

export const HeroCarouselSection: React.FC<HeroCarouselSectionProps> = ({
  galleryImages = [],
  badge = "India's #1 Gen-Z Living Experience",
  subheadline = "Premium coliving, ultra-fast fiber, creative workspaces, and vibrant community living across 4 hand-curated hostel sanctuaries in Madhapur.",
}) => {
  // Directly use gallery images fetched from the database
  const carouselImages = React.useMemo(() => {
    if (galleryImages && galleryImages.length > 0) {
      return galleryImages.slice(0, 7);
    }
    return defaultImages;
  }, [galleryImages]);

  const [currentIndex, setCurrentIndex] = useState(0);

  // Automatic scrolling / cycling through carousel images
  useEffect(() => {
    if (carouselImages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % carouselImages.length);
    }, 4500);

    return () => clearInterval(interval);
  }, [carouselImages.length]);

  return (
    <section className="relative z-20 min-h-[85vh] lg:min-h-[92vh] flex flex-col justify-between pt-6 pb-20 lg:pt-8 lg:pb-28 bg-[#0B0F19]">
      {/* Background layer with seamless mask fade */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Full-width Carousel Image Container with CSS Mask Fade - eliminates any hard edge */}
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            maskImage:
              "linear-gradient(to right, transparent 0%, transparent 20%, rgba(0, 0, 0, 0.4) 38%, black 60%), linear-gradient(to top, transparent 0%, rgba(0, 0, 0, 0.8) 15%, black 30%)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, transparent 20%, rgba(0, 0, 0, 0.4) 38%, black 60%), linear-gradient(to top, transparent 0%, rgba(0, 0, 0, 0.8) 15%, black 30%)",
            maskComposite: "intersect",
            WebkitMaskComposite: "source-in",
          }}
        >
          {carouselImages.map((img, index) => {
            const isActive = index === currentIndex;
            return (
              <div
                key={img.id || index}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  isActive ? "opacity-100" : "opacity-0"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt={img.title || "GenZ Living Space"}
                  className={`w-full h-full object-cover object-right md:object-center transform transition-transform duration-[7000ms] ease-out ${
                    isActive ? "scale-105" : "scale-100"
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Full-width Smooth Gradient Overlays (Zero hard edges across the entire hero) */}
        {/* 1. Left-to-right fade for seamless text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0F19] via-[#0B0F19]/85 md:via-[#0B0F19]/65 md:via-[35%] to-transparent z-[1]" />

        {/* 2. Bottom fade for search and metrics blending */}
        <div className="absolute inset-x-0 bottom-0 h-40 sm:h-56 bg-gradient-to-t from-[#0B0F19] via-[#0B0F19]/80 to-transparent z-[1]" />

        {/* 3. Top fade for navbar transition */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#0B0F19]/90 to-transparent z-[1]" />

        {/* Ambient Neon Glows */}
        <div className="absolute top-1/4 left-4 sm:left-12 w-80 sm:w-96 h-80 sm:h-96 bg-purple-600/15 blur-[120px] rounded-full z-[1]" />
        <div className="absolute top-8 left-1/3 w-[600px] h-[300px] bg-indigo-600/10 blur-[140px] rounded-full z-[1]" />
      </div>

      {/* Foreground Hero Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full flex-1 flex flex-col justify-center">
        {/* Left-Aligned Headline Block */}
        <div className="max-w-2xl text-left space-y-5">
          {/* Top Pill Badge */}
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111827]/75 border border-indigo-500/30 text-xs font-semibold text-indigo-200 backdrop-blur-md shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Flame className="w-3.5 h-3.5 text-pink-400 fill-pink-400" />
              <span>{badge}</span>
            </div>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] text-white">
            More Than a Stay<span className="text-cyan-400">.</span>
            <br />
            A Better Way to{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-pink-500">
              Live
            </span>
            <span className="text-pink-500">.</span>
          </h1>

          {/* Subtitle / Paragraph */}
          <p className="text-slate-300 text-sm sm:text-base lg:text-lg max-w-xl font-normal leading-relaxed">
            {subheadline}
          </p>

          {/* Carousel Progress Indicators (Dots) - No next/prev buttons as requested */}
          <div className="flex items-center gap-2 pt-2 pb-4">
            {carouselImages.map((img, idx) => (
              <button
                key={img.id || idx}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Jump to slide ${idx + 1}: ${img.title || ""}`}
                className={`transition-all duration-300 cursor-pointer ${
                  idx === currentIndex
                    ? "w-7 h-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 shadow-[0_0_10px_rgba(236,72,153,0.6)]"
                    : "w-2 h-2 rounded-full bg-slate-500/50 hover:bg-slate-300"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Interactive Search Bar */}
        <div className="mt-8 max-w-5xl mx-auto w-full relative z-30">
          <HeroSearch />
        </div>

        {/* Quick Metrics Bar */}
        <div className="mt-10 sm:mt-12 grid grid-cols-3 gap-3 sm:gap-4 max-w-4xl mx-auto w-full relative z-10">
          <div className="glass-panel p-3.5 sm:p-4 rounded-2xl text-center border border-slate-800/80 bg-[#111827]/60 backdrop-blur-md">
            <span className="block text-2xl sm:text-3xl font-black text-cyan-400 tracking-tight">1 Gbps</span>
            <span className="text-[11px] sm:text-xs text-slate-400 font-medium">Fiber Optic Wi-Fi</span>
          </div>
          <div className="glass-panel p-3.5 sm:p-4 rounded-2xl text-center border border-slate-800/80 bg-[#111827]/60 backdrop-blur-md">
            <span className="block text-2xl sm:text-3xl font-black text-amber-300 tracking-tight">4.9 ★</span>
            <span className="text-[11px] sm:text-xs text-slate-400 font-medium">Average Guest Rating</span>
          </div>
          <div className="glass-panel p-3.5 sm:p-4 rounded-2xl text-center border border-slate-800/80 bg-[#111827]/60 backdrop-blur-md">
            <span className="block text-2xl sm:text-3xl font-black text-pink-400 tracking-tight">10,000+</span>
            <span className="text-[11px] sm:text-xs text-slate-400 font-medium">Happy Nomads</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroCarouselSection;
