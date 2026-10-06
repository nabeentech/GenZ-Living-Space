import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, [ROLES.SUPER_ADMIN, ROLES.FINANCE])) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const {
      code,
      description,
      discountType = "PERCENTAGE",
      discountValue,
      minBookingAmount = 0,
      maxDiscountAmount,
      expiryDate,
      usageLimit = 500,
    } = await req.json();

    if (!code || !discountValue) {
      return NextResponse.json(
        { success: false, message: "Coupon code and discount value are required" },
        { status: 400 }
      );
    }

    const created = await prisma.coupon.create({
      data: {
        code: code.trim().toUpperCase(),
        description: description || `Promo discount coupon ${code}`,
        discountType,
        discountValue: Number(discountValue),
        minBookingAmount: Number(minBookingAmount),
        maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
        startDate: new Date(),
        expiryDate: expiryDate ? new Date(expiryDate) : new Date("2028-12-31"),
        usageLimit: Number(usageLimit),
        active: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Coupon ${created.code} created successfully`,
      data: created,
    });
  } catch (error: any) {
    console.error("Coupon creation error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create coupon" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: coupons });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch coupons" },
      { status: 500 }
    );
  }
}
