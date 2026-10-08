import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PATCH update room type pricing
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user || !["SUPER_ADMIN", "PROPERTY_MANAGER", "FINANCE"].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const { id } = params;
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

    // Update room type with new AC/Non-AC pricing
    const updatedRoomType = await prisma.roomType.update({
      where: { id },
      data: {
        ...(pricePerDayNonAC !== undefined && { pricePerDayNonAC: parseFloat(pricePerDayNonAC) }),
        ...(price7DaysNonAC !== undefined && { price7DaysNonAC: parseFloat(price7DaysNonAC) }),
        ...(price10DaysNonAC !== undefined && { price10DaysNonAC: parseFloat(price10DaysNonAC) }),
        ...(price15DaysNonAC !== undefined && { price15DaysNonAC: parseFloat(price15DaysNonAC) }),
        ...(price30DaysNonAC !== undefined && { price30DaysNonAC: parseFloat(price30DaysNonAC) }),
        ...(pricePerDayAC !== undefined && { pricePerDayAC: parseFloat(pricePerDayAC) }),
        ...(price7DaysAC !== undefined && { price7DaysAC: parseFloat(price7DaysAC) }),
        ...(price10DaysAC !== undefined && { price10DaysAC: parseFloat(price10DaysAC) }),
        ...(price15DaysAC !== undefined && { price15DaysAC: parseFloat(price15DaysAC) }),
        ...(price30DaysAC !== undefined && { price30DaysAC: parseFloat(price30DaysAC) }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Room type pricing updated successfully",
      data: updatedRoomType,
    });
  } catch (error: any) {
    console.error("Error updating room type:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update room type" },
      { status: 500 }
    );
  }
}
