"use client";

import React, { useState } from "react";
import {
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Camera,
  Grid,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

export interface HeroGalleryImage {
  id: string;
  src: string;
  title: string;
  category?: string;
}

interface HostelHeroGalleryProps {
  images: HeroGalleryImage[];
  hostelName: string;
}

export const HostelHeroGallery: React.FC<HostelHeroGalleryProps> = ({
  images,
  hostelName,
}) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-80 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-slate-400 gap-3 mb-10">
        <Camera className="w-10 h-10 text-slate-600" />
        <span className="text-sm font-medium">Gallery photos uploading soon</span>
      </div>
    );
  }

  const mainImage = images[0];
  const sideImages = images.slice(1, 5);
  const currentLightbox = lightboxIndex !== null ? images[lightboxIndex] : null;

  const showNext = () => {
    if (lightboxIndex !== null && lightboxIndex < images.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    } else {
      setLightboxIndex(0);
    }
  };

  const showPrev = () => {
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    } else {
      setLightboxIndex(images.length - 1);
    }
  };

  return (
    <>
      <div className="relative mb-10">
        {/* Gallery Grid */}
        <div
          className={`grid gap-3 rounded-3xl overflow-hidden ${
            sideImages.length === 0
              ? "grid-cols-1 h-[420px]"
              : sideImages.length === 1
              ? "grid-cols-1 md:grid-cols-2 h-[420px]"
              : "grid-cols-1 md:grid-cols-4 h-[420px]"
          }`}
        >
          {/* Main Large Photo */}
          <div
            onClick={() => setLightboxIndex(0)}
            className={`${
              sideImages.length >= 2 ? "md:col-span-2" : "col-span-1"
            } h-full relative group cursor-pointer overflow-hidden bg-slate-950`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mainImage.src}
              alt={mainImage.title || hostelName}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition" />

            <div className="absolute top-4 left-4">
              {mainImage.category && (
                <Badge variant="indigo" size="sm" className="backdrop-blur-md bg-indigo-950/80">
                  {mainImage.category.replace("_", " ")}
                </Badge>
              )}
            </div>

            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
              <span className="text-sm font-bold truncate drop-shadow-md">
                {mainImage.title}
              </span>
              <span className="p-2 rounded-xl bg-black/60 backdrop-blur-md opacity-0 group-hover:opacity-100 transition">
                <Maximize2 className="w-4 h-4" />
              </span>
            </div>
          </div>

          {/* Side 2x2 Grid (for images 2..5) */}
          {sideImages.length > 0 && (
            <div
              className={`hidden md:grid ${
                sideImages.length >= 2 ? "col-span-2 grid-cols-2" : "col-span-1 grid-cols-1"
              } gap-3 h-full`}
            >
              {sideImages.map((img, i) => (
                <div
                  key={img.id || i}
                  onClick={() => setLightboxIndex(i + 1)}
                  className="h-full relative overflow-hidden group cursor-pointer bg-slate-950"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.src}
                    alt={img.title || `${hostelName} view ${i + 2}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition" />

                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white opacity-0 group-hover:opacity-100 transition">
                    <span className="text-xs font-semibold truncate drop-shadow">
                      {img.title}
                    </span>
                    <span className="p-1.5 rounded-lg bg-black/70 backdrop-blur-sm">
                      <Maximize2 className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Floating View All Photos Button */}
        {images.length > 1 && (
          <button
            onClick={() => setLightboxIndex(0)}
            className="absolute bottom-4 right-4 z-10 flex items-center gap-2 px-4 py-2 rounded-xl bg-black/80 hover:bg-black text-white text-xs font-bold backdrop-blur-md border border-white/20 shadow-xl hover:scale-105 transition"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>View All Photos ({images.length})</span>
          </button>
        )}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {currentLightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-200">
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-5 right-5 p-3 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 transition z-20"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={showPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/80 text-white hover:bg-indigo-600 transition z-20"
                aria-label="Previous"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={showNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/80 text-white hover:bg-indigo-600 transition z-20"
                aria-label="Next"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <div className="max-w-5xl max-h-[90vh] flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentLightbox.src}
              alt={currentLightbox.title}
              className="max-h-[75vh] w-auto object-contain rounded-2xl shadow-2xl"
            />
            <div className="mt-4 text-center space-y-1.5">
              <h3 className="text-xl font-bold text-white">{currentLightbox.title}</h3>
              <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
                {currentLightbox.category && (
                  <Badge variant="indigo" size="sm">
                    {currentLightbox.category.replace("_", " ")}
                  </Badge>
                )}
                <span>
                  Photo {lightboxIndex! + 1} of {images.length}
                </span>
                <span>•</span>
                <span>{hostelName}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HostelHeroGallery;
