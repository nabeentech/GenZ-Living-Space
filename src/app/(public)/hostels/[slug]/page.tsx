import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  MapPin,
  Star,
  Wifi,
  Coffee,
  Shield,
  Clock,
  Phone,
  Mail,
  CheckCircle2,
  Users,
  Calendar,
  ArrowRight,
} from "lucide-react";
import HostelBookingWidget from "./HostelBookingWidget";

export const dynamic = "force-dynamic";

interface PropertyPageProps {
  params: {
    slug: string;
  };
  searchParams: {
    checkIn?: string;
    checkOut?: string;
    guests?: string;
  };
}

export default async function HostelDetailPage({
  params,
  searchParams,
}: PropertyPageProps) {
  const user = await getSessionUser();

  const hostel = await prisma.hostel.findUnique({
    where: { slug: params.slug },
    include: {
      amenities: {
        include: {
          amenity: true,
        },
      },
      rooms: {
        include: {
          roomType: true,
          beds: true,
        },
      },
      reviews: {
        where: { status: "APPROVED" },
        include: { customer: true },
      },
    },
  });

  if (!hostel) {
    notFound();
  }

  // Parse images and rules
  let galleryImages: string[] = [];
  try {
    galleryImages = JSON.parse(hostel.images || "[]");
  } catch {
    galleryImages = [hostel.coverImage];
  }
  if (galleryImages.length === 0) {
    galleryImages = [hostel.coverImage];
  }

  let houseRules: string[] = [];
  try {
    houseRules = JSON.parse(hostel.rules || "[]");
  } catch {
    houseRules = [
      "Government ID verification mandatory at reception",
      "Quiet hours observed from 11 PM to 7 AM",
      "Rooftop access open 24/7 for residents",
    ];
  }

  // Extract unique room types in this hostel
  const roomTypeMap = new Map();
  hostel.rooms.forEach((r) => {
    if (!roomTypeMap.has(r.roomTypeId)) {
      const availBeds = r.beds.filter((b) => b.status === "AVAILABLE").length;
      roomTypeMap.set(r.roomTypeId, {
        ...r.roomType,
        availableBeds: availBeds,
      });
    } else {
      const existing = roomTypeMap.get(r.roomTypeId);
      const moreAvail = r.beds.filter((b) => b.status === "AVAILABLE").length;
      existing.availableBeds += moreAvail;
    }
  });

  const availableRoomTypes = Array.from(roomTypeMap.values());

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 pb-20">
        {/* Top Hero Gallery Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
            <Link href="/" className="hover:text-white">
              Home
            </Link>
            <span>/</span>
            <Link href="/hostels" className="hover:text-white">
              The 2 Properties
            </Link>
            <span>/</span>
            <span className="text-indigo-400 font-semibold">{hostel.name}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 h-[420px] rounded-3xl overflow-hidden mb-10">
            <div className="md:col-span-2 h-full relative group">
              <img
                src={galleryImages[0] || hostel.coverImage}
                alt={hostel.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            </div>
            <div className="hidden md:grid col-span-2 grid-cols-2 gap-3 h-full">
              {galleryImages.slice(1, 5).map((img, i) => (
                <div key={i} className="h-full relative overflow-hidden group">
                  <img
                    src={img}
                    alt={`${hostel.name} view ${i + 2}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition" />
                </div>
              ))}
            </div>
          </div>

          {/* Main Content & Sticky Booking Widget */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Left Col: Details, Rooms, Amenities, Rules, Reviews */}
            <div className="lg:col-span-2 space-y-12">
              {/* Title & Stats */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant="indigo">{hostel.city}</Badge>
                  <div className="flex items-center gap-1 text-sm font-bold text-amber-300">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span>{hostel.rating.toFixed(1)}</span>
                    <span className="text-slate-400 font-normal">
                      ({hostel.reviews.length} reviews)
                    </span>
                  </div>
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  {hostel.name}
                </h1>
                <p className="text-sm font-medium text-pink-400 mt-1">
                  {hostel.tagline}
                </p>

                <div className="flex items-center gap-2 text-sm text-slate-400 mt-3">
                  <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>{hostel.address}, {hostel.postalCode}</span>
                </div>
              </div>

              {/* Description */}
              <div className="glass-panel p-6 rounded-3xl border border-slate-800/80 bg-[#101626]/70 space-y-3">
                <h3 className="text-lg font-bold text-white">About The Space</h3>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                  {hostel.description}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800/60 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span>Check-In: {hostel.checkInTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-pink-400" />
                    <span>Check-Out: {hostel.checkOutTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-400" />
                    <span>{hostel.contactPhone}</span>
                  </div>
                </div>
              </div>

              {/* Room Types Catalog */}
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-white">Available Room & Pod Types</h3>
                <div className="space-y-4">
                  {availableRoomTypes.map((rt) => (
                    <div
                      key={rt.id}
                      className="glass-panel p-6 rounded-3xl border border-slate-800/80 bg-[#101626]/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 hover:border-indigo-500/40 transition"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-white">{rt.name}</span>
                          <Badge
                            variant={
                              rt.genderCategory === "FEMALE"
                                ? "coral"
                                : rt.genderCategory === "PRIVATE"
                                ? "cyan"
                                : "default"
                            }
                            size="sm"
                          >
                            {rt.genderCategory}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 max-w-md">{rt.description}</p>
                        <div className="flex items-center gap-3 text-xs text-emerald-400 font-semibold pt-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span>{rt.availableBeds} beds currently available</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                        <div>
                          <span className="text-2xl font-black text-white">
                            ₹{rt.basePrice}
                          </span>
                          <span className="text-xs text-slate-400"> / night</span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Monthly: ₹{rt.monthlyPrice.toLocaleString()}
                        </span>
                        <Link
                          href={`/book?hostel=${hostel.slug}&roomType=${rt.id}`}
                          className="w-full sm:w-auto"
                        >
                          <Button variant="glow" size="sm" className="w-full">
                            Select Room
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Amenities List */}
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-white">Property Amenities</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {hostel.amenities.map((ha) => (
                    <div
                      key={ha.id}
                      className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-xl bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                      </div>
                      <span className="text-xs font-semibold text-slate-200">
                        {ha.amenity.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* House Rules */}
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-white">House Rules & Safety</h3>
                <ul className="space-y-2.5">
                  {houseRules.map((rule, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-3 text-sm text-slate-300 p-3 rounded-xl bg-slate-900/40 border border-slate-800/60"
                    >
                      <CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0" />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Guest Reviews */}
              {hostel.reviews.length > 0 && (
                <div className="space-y-6 pt-6 border-t border-slate-800/80">
                  <h3 className="text-2xl font-bold text-white">Verified Guest Reviews</h3>
                  <div className="space-y-4">
                    {hostel.reviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="glass-panel p-6 rounded-2xl border border-slate-800/70 bg-[#111827]/70 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                              {rev.customer.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white">
                                {rev.customer.name}
                              </h4>
                              <span className="text-[11px] text-slate-400">
                                {new Date(rev.createdAt).toLocaleDateString("en-IN", {
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            <span>{rev.overallRating.toFixed(1)}</span>
                          </div>
                        </div>
                        <h5 className="text-sm font-semibold text-white">{rev.title}</h5>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          "{rev.comment}"
                        </p>
                        {rev.staffResponse && (
                          <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-xs text-indigo-300 mt-2">
                            <span className="font-bold block mb-0.5">Response from GenZ Space:</span>
                            {rev.staffResponse}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Col: Sticky Booking Widget */}
            <div className="lg:col-span-1">
              <div className="sticky top-28">
                <HostelBookingWidget
                  hostel={hostel}
                  roomTypes={availableRoomTypes}
                  initialCheckIn={searchParams.checkIn}
                  initialCheckOut={searchParams.checkOut}
                  initialGuests={searchParams.guests}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
