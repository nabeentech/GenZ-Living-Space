import React from "react";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Star, Wifi, Shield, Coffee, Sparkles, ArrowRight } from "lucide-react";
import Button from "../ui/Button";
import Badge from "../ui/Badge";

export interface PropertyCardProps {
  slug: string;
  name: string;
  tagline: string;
  city: string;
  address: string;
  rating: number;
  coverImage: string;
  startingPrice?: number;
  availableBeds?: number;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  slug,
  name,
  tagline,
  city,
  address,
  rating,
  coverImage,
  startingPrice = 599,
  availableBeds = 14,
}) => {
  return (
    <div className="glass-panel glass-panel-hover rounded-3xl overflow-hidden flex flex-col group border border-slate-800/80 bg-[#101626]/90 transition-all duration-300">
      {/* Cover Image Container */}
      <div className="relative h-64 w-full overflow-hidden">
        <img
          src={coverImage}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#101626] via-transparent to-black/30" />

        {/* Badges on Top */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <Badge variant="indigo" size="sm" className="backdrop-blur-md bg-indigo-950/80">
            {city}
          </Badge>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/85 backdrop-blur-md border border-slate-700/60 text-xs font-bold text-amber-300">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{rating.toFixed(1)}</span>
          </div>
        </div>

        {/* Availability Pill */}
        <div className="absolute bottom-3 left-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {availableBeds} beds available
          </span>
        </div>
      </div>

      {/* Details Container */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">
            {name}
          </h3>
          <p className="text-xs font-medium text-pink-400 tracking-wide mt-0.5">
            {tagline}
          </p>
          <div className="flex items-center gap-1 text-xs text-slate-400 mt-2 line-clamp-1">
            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>{address}</span>
          </div>
        </div>

        {/* Amenity Highlights */}
        <div className="flex items-center gap-4 py-2 border-y border-slate-800/80 text-xs text-slate-300">
          <div className="flex items-center gap-1.5" title="Gigabit Wi-Fi">
            <Wifi className="w-3.5 h-3.5 text-cyan-400" />
            <span>1 Gbps</span>
          </div>
          <div className="flex items-center gap-1.5" title="Rooftop Cafe">
            <Coffee className="w-3.5 h-3.5 text-amber-400" />
            <span>Cafe & Pods</span>
          </div>
          <div className="flex items-center gap-1.5" title="Biometric Security">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>24/7 Safety</span>
          </div>
        </div>

        {/* Price & Action CTA */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Starts from</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-white">₹{startingPrice}</span>
              <span className="text-xs text-slate-400">/ night</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/hostels/${slug}`}>
              <Button variant="outline" size="sm">
                Details
              </Button>
            </Link>
            <Link href={`/book?hostel=${slug}`}>
              <Button variant="glow" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Book Bed
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
