import React from "react";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { canAccessModule, getFirstAllowedAdminRoute } from "@/lib/permissions";
import WalkInClient from "./WalkInClient";

export const dynamic = "force-dynamic";

export default async function WalkInPage({
  searchParams,
}: {
  searchParams?: Promise<{ hostelId?: string; roomId?: string; bedId?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || !canAccessModule(user, "walkin")) {
    redirect(getFirstAllowedAdminRoute(user));
  }
  const resolved = searchParams ? await searchParams : {};
  const [hostels, coupons] = await Promise.all([
    prisma.hostel.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        city: true,
        rooms: {
          where: { active: true, status: "ACTIVE" },
          orderBy: [{ floor: "asc" }, { roomNumber: "asc" }],
          select: {
            id: true,
            roomNumber: true,
            floor: true,
            capacity: true,
            isAC: true,
            roomTypeId: true,
            roomType: {
              select: {
                id: true,
                name: true,
                slug: true,
                totalBeds: true,
                genderCategory: true,
                basePrice: true,
                monthlyPrice: true,
                weeklyDiscountPct: true,
                pricePerDayNonAC: true,
                price7DaysNonAC: true,
                price10DaysNonAC: true,
                price15DaysNonAC: true,
                price30DaysNonAC: true,
                pricePerDayAC: true,
                price7DaysAC: true,
                price10DaysAC: true,
                price15DaysAC: true,
                price30DaysAC: true,
                maintenanceFee: true,
                securityDeposit: true,
              },
            },
            beds: {
              where: { active: true },
              orderBy: { bedNumber: "asc" },
              select: {
                id: true,
                bedNumber: true,
                tier: true,
                status: true,
              },
            },
          },
        },
      },
    }),
    prisma.coupon.findMany({
      where: { active: true },
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        discountType: true,
        discountValue: true,
        minBookingAmount: true,
        maxDiscountAmount: true,
        startDate: true,
        expiryDate: true,
        usedCount: true,
        usageLimit: true,
        applicableHostelId: true,
        active: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">
          Reception Desk
        </span>
        <h1 className="text-3xl font-black text-white">Walk-In Reservation</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Process manual on-spot bookings for guests arriving directly at the hostel counter.
        </p>
      </div>

      <WalkInClient
        hostels={hostels}
        coupons={coupons}
        initialHostelId={resolved.hostelId}
        initialRoomId={resolved.roomId}
        initialBedId={resolved.bedId}
      />
    </div>
  );
}
