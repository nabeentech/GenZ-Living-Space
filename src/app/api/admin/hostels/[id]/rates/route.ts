import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user.role, [ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER])) {
    return NextResponse.json({ success: false, message: "Owner access is required to change hostel prices." }, { status: 403 });
  }
  try {
    const hostel = await prisma.hostel.findFirst({ where: { id: params.id, active: true }, select: { id: true } });
    if (!hostel) return NextResponse.json({ success: false, message: "Hostel not found." }, { status: 404 });
    const body = await req.json();
    if (!Array.isArray(body.rates) || body.rates.length < 8 || body.rates.length > 10) return NextResponse.json({ success: false, message: "Provide prices for room types, AC options, and any discounted rate." }, { status: 400 });
    const keys = new Set<string>();
    for (const rate of body.rates) {
      const capacity = Number(rate.capacity);
      const monthlyRate = Number(rate.monthlyRate);
      const rateCategory = rate.rateCategory || "STANDARD";
      if (![1, 2, 3, 4].includes(capacity) || typeof rate.isAC !== "boolean" || !["STANDARD", "DISCOUNTED"].includes(rateCategory) || (rateCategory === "DISCOUNTED" && capacity !== 2) || !["PER_BED", "PER_ROOM"].includes(rate.pricingUnit || "PER_BED") || !Number.isFinite(monthlyRate) || monthlyRate < 0 || monthlyRate > 10000000) {
        return NextResponse.json({ success: false, message: "Enter valid prices for single, double, triple, and four sharing rooms." }, { status: 400 });
      }
      const key = `${capacity}:${rate.isAC}:${rateCategory}`;
      if (keys.has(key)) return NextResponse.json({ success: false, message: "A room pricing option is duplicated." }, { status: 400 });
      keys.add(key);
    }
    await prisma.$transaction(async (tx) => {
      for (const rate of body.rates as Array<{ capacity: number; isAC: boolean; monthlyRate: number; rateCategory?: string; pricingUnit?: string }>) {
        await tx.$executeRawUnsafe(
          `INSERT INTO HostelRoomRate (id, hostelId, capacity, isAC, rateCategory, pricingUnit, monthlyRate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT(hostelId, capacity, isAC, rateCategory) DO UPDATE SET pricingUnit = excluded.pricingUnit, monthlyRate = excluded.monthlyRate, updatedAt = CURRENT_TIMESTAMP`,
          randomUUID(), hostel.id, Number(rate.capacity), rate.isAC, rate.rateCategory || "STANDARD", rate.pricingUnit || "PER_BED", Number(rate.monthlyRate),
        );
      }
    });
    return NextResponse.json({ success: true, message: "Monthly prices saved for this hostel." });
  } catch (error) {
    console.error("Hostel pricing update error:", error);
    return NextResponse.json({ success: false, message: "Could not save prices. Please try again." }, { status: 500 });
  }
}
