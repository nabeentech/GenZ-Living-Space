import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { SHARING_NAMES, SHARING_DESCRIPTIONS } from "@/lib/room-types";

export const dynamic = "force-dynamic";

// PATCH update room type pricing
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user || !["SUPER_ADMIN", "PROPERTY_MANAGER", "FINANCE"].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    // Validate pricing data
    const {
      pricePerDayNonAC,
      price7DaysNonAC,
      price10DaysNonAC,
      price15DaysNonAC,
      price30DaysNonAC,
      pricePerDayAC,
      price7DaysAC,
      price10DaysAC,
      price15DaysAC,
      price30DaysAC,
    } = body;

    const priceFields = [
      "pricePerDayNonAC", "price7DaysNonAC", "price10DaysNonAC", "price15DaysNonAC", "price30DaysNonAC",
      "pricePerDayAC", "price7DaysAC", "price10DaysAC", "price15DaysAC", "price30DaysAC",
    ];
    const suppliedFields = priceFields.filter((field) => body[field] !== undefined);
    if (suppliedFields.length === 0 || suppliedFields.some((field) => {
      const value = Number(body[field]);
      return body[field] === "" || !Number.isFinite(value) || value < 0;
    })) {
      return NextResponse.json(
        { success: false, message: "Provide valid non-negative values for at least one pricing tier." },
        { status: 400 }
      );
    }

    // Update room type with new AC/Non-AC pricing
    const updatedRoomType = await prisma.roomType.update({
      where: { id },
      data: {
        ...(pricePerDayNonAC !== undefined && { pricePerDayNonAC: Number(pricePerDayNonAC) }),
        ...(price7DaysNonAC !== undefined && { price7DaysNonAC: Number(price7DaysNonAC) }),
        ...(price10DaysNonAC !== undefined && { price10DaysNonAC: Number(price10DaysNonAC) }),
        ...(price15DaysNonAC !== undefined && { price15DaysNonAC: Number(price15DaysNonAC) }),
        ...(price30DaysNonAC !== undefined && { price30DaysNonAC: Number(price30DaysNonAC) }),
        ...(pricePerDayAC !== undefined && { pricePerDayAC: Number(pricePerDayAC) }),
        ...(price7DaysAC !== undefined && { price7DaysAC: Number(price7DaysAC) }),
        ...(price10DaysAC !== undefined && { price10DaysAC: Number(price10DaysAC) }),
        ...(price15DaysAC !== undefined && { price15DaysAC: Number(price15DaysAC) }),
        ...(price30DaysAC !== undefined && { price30DaysAC: Number(price30DaysAC) }),
      },
    });
    return NextResponse.json({
      success: true,
      message: "Room type pricing updated successfully",
      data: {
        ...updatedRoomType,
        name: SHARING_NAMES[updatedRoomType.totalBeds] || updatedRoomType.name,
        description: SHARING_DESCRIPTIONS[updatedRoomType.totalBeds] || updatedRoomType.description,
      },
    });
  } catch (error: any) {
    console.error("Error updating room type:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update room type" },
      { status: 500 }
    );
  }
}
