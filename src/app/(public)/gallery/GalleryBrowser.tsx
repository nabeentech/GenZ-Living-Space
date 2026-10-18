"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Camera,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowRight,
  Compass,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { PublicGalleryImage } from "@/components/public/HostelGallerySection";

interface HostelOption {
  id: string;
  name: string;
  slug: string;
  city: string;
}

interface GalleryBrowserProps {
  initialImages: PublicGalleryImage[];
  hostels: HostelOption[];
}

const CATEGORIES = [
  { id: "ALL", label: "All Spaces" },
  { id: "ROOMS", label: "Rooms & Pods" },
  { id: "COMMON_AREA", label: "Lounge & Chill" },
  { id: "ROOFTOP", label: "Rooftop Terrace" },
  { id: "WORKSPACE", label: "Work & Study" },
  { id: "DINING", label: "Café & Dining" },
  { id: "EVENTS", label: "Gaming Zone" },
  { id: "OTHER", label: "Facilities" },
];

export const GalleryBrowser: React.FC<GalleryBrowserProps> = ({
  initialImages,
  hostels,
}) => {
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [selectedHostel, setSelectedHostel] = useState("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filteredImages = initialImages.filter((img) => {
    const matchesCategory =
      activeCategory === "ALL" || img.category.toUpperCase() === activeCategory.toUpperCase();
    const matchesHostel =
      selectedHostel === "all" || img.hostel?.id === selectedHostel;
    return matchesCategory && matchesHostel;
  });

  const currentLightboxItem = lightboxIndex !== null ? filteredImages[lightboxIndex] : null;

  const showNext = () => {
    if (lightboxIndex !== null && lightboxIndex < filteredImages.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    } else {
      setLightboxIndex(0);
    }
  };

  const showPrev = () => {
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    } else {
      setLightboxIndex(filteredImages.length - 1);
    }
  };

  return (
    <div className="space-y-8">
      {/* Filter and Property Control Bar */}
      <div className="glass-panel p-4 rounded-3xl border border-slate-800 bg-[#111827]/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
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
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-glow"
                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
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

        {/* Hostel Dropdown Filter (only if multiple properties) */}
        {hostels.length > 1 && (
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedHostel}
              onChange={(e) => setSelectedHostel(e.target.value)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="all">All Hostels ({initialImages.length})</option>
              {hostels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.city})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Grid of Photos */}
      {filteredImages.length === 0 ? (
        <div className="glass-panel p-16 rounded-3xl border border-slate-800 text-center space-y-4 max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
            <Camera className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No photos in this category yet</h3>
            <p className="text-xs text-slate-400 mt-1">
              Select another category or view all spaces to explore our hostel.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setActiveCategory("ALL");
              setSelectedHostel("all");
            }}
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredImages.map((img, index) => (
            <div
              key={img.id}
              onClick={() => setLightboxIndex(index)}
              className="group relative h-80 rounded-3xl overflow-hidden cursor-pointer border border-slate-800/80 bg-slate-900 shadow-xl transition-all duration-300 hover:border-indigo-500/50 hover:shadow-glow"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
              />

              {/* Subtle hover overlay with expand icon - no texts */}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <span className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-2xl transform scale-90 group-hover:scale-100 transition-transform">
                  <Maximize2 className="w-5 h-5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal - Pure photo presentation */}
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

          <div className="max-w-6xl max-h-[92vh] flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentLightboxItem.src}
              alt=""
              className="max-h-[88vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryBrowser;
