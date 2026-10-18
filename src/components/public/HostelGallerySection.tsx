"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Camera,
  Layers,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

export interface PublicGalleryImage {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  isFeatured: boolean;
  src: string;
  hostel?: {
    id: string;
    name: string;
    slug: string;
    city: string;
  } | null;
}

interface HostelGallerySectionProps {
  initialImages: PublicGalleryImage[];
}

const CATEGORIES = [
  { id: "ALL", label: "All Spaces" },
  { id: "ROOMS", label: "Rooms & Pods" },
  { id: "COMMON_AREA", label: "Lounge & Chill" },
  { id: "ROOFTOP", label: "Rooftop Terrace" },
  { id: "WORKSPACE", label: "Work & Study" },
  { id: "DINING", label: "Café & Dining" },
  { id: "EVENTS", label: "Gaming Zone" },
];

export const HostelGallerySection: React.FC<HostelGallerySectionProps> = ({
  initialImages,
}) => {
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filteredImages = initialImages.filter((img) => {
    if (activeCategory === "ALL") return true;
    return img.category.toUpperCase() === activeCategory.toUpperCase();
  });

  const displayImages = filteredImages.slice(0, 8);
  const currentLightboxItem = lightboxIndex !== null ? displayImages[lightboxIndex] : null;

  const showNext = () => {
    if (lightboxIndex !== null && lightboxIndex < displayImages.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    } else {
      setLightboxIndex(0);
    }
  };

  const showPrev = () => {
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    } else {
      setLightboxIndex(displayImages.length - 1);
    }
  };

  if (initialImages.length === 0) {
    return null;
  }

  return (
    <section id="gallery" className="py-24 relative overflow-hidden bg-[#07090E]/80">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-0 w-96 h-96 bg-pink-500/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel border border-indigo-500/30 text-xs font-semibold text-indigo-300">
              <Camera className="w-3.5 h-3.5 text-pink-400" />
              <span>Hostel Spaces & Visual Tour</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Life at <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">GenZ Living Space</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-300">
              Take an authentic look inside our living pods, coworking lounges, and rooftop community terraces.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/gallery">
              <Button
                variant="outline"
                size="md"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                View Full Gallery ({initialImages.length})
              </Button>
            </Link>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {CATEGORIES.map((cat) => {
            const count =
              cat.id === "ALL"
                ? initialImages.length
                : initialImages.filter((img) => img.category.toUpperCase() === cat.id.toUpperCase()).length;

            if (cat.id !== "ALL" && count === 0) return null;

            const isActive = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition flex items-center gap-2 ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-glow"
                    : "glass-panel bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Image Grid Showcase */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {displayImages.map((img, index) => (
            <div
              key={img.id}
              onClick={() => setLightboxIndex(index)}
              className="group relative h-72 sm:h-80 rounded-3xl overflow-hidden cursor-pointer border border-slate-800/80 bg-slate-900 shadow-xl transition-all duration-300 hover:border-indigo-500/50 hover:shadow-glow"
            >
              {/* Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt={img.title}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
              />

              {/* Gradient Dark Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/30 group-hover:via-black/10 transition duration-300" />

              {/* Top Tag */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider backdrop-blur-md bg-black/60 border border-white/10 text-white">
                  {img.category.replace("_", " ")}
                </span>
                <span className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="w-3.5 h-3.5" />
                </span>
              </div>

              {/* Bottom Caption Pill */}
              <div className="absolute bottom-4 left-4 right-4 space-y-1">
                <h4 className="text-sm font-bold text-white tracking-tight line-clamp-1 group-hover:text-indigo-300 transition-colors">
                  {img.title}
                </h4>
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                  <span>
                    {!img.hostel?.name || img.hostel.name === "Madhapur - 01" || img.hostel.name === "Madhapur 01"
                      ? "GenZ Colive PG & Guest Rooms"
                      : img.hostel.name}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA to see more */}
        {initialImages.length > 8 && (
          <div className="text-center pt-4">
            <Link href="/gallery">
              <Button
                variant="glow"
                size="lg"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Explore All {initialImages.length} Photos in Gallery
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {currentLightboxItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-200">
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-5 right-5 p-3 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 transition z-20"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>

          <button
            onClick={showPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/80 text-white hover:bg-indigo-600 transition z-20"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={showNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/80 text-white hover:bg-indigo-600 transition z-20"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          <div className="max-w-5xl max-h-[90vh] flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentLightboxItem.src}
              alt={currentLightboxItem.title}
              className="max-h-[75vh] w-auto object-contain rounded-2xl shadow-2xl"
            />
            <div className="mt-4 text-center space-y-1.5">
              <h3 className="text-xl font-bold text-white">{currentLightboxItem.title}</h3>
              <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
                <Badge variant="indigo" size="sm">
                  {currentLightboxItem.category.replace("_", " ")}
                </Badge>
                {currentLightboxItem.hostel && (
                  <span>{currentLightboxItem.hostel.name} • {currentLightboxItem.hostel.city}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default HostelGallerySection;
