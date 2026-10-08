import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET all room types with pricing tiers
export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !["SUPER_ADMIN", "PROPERTY_MANAGER", "FINANCE"].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const roomTypes = await prisma.roomType.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: roomTypes,
    });
  } catch (error: any) {
    console.error("Error fetching room types:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch room types" },
      { status: 500 }
    );
  }
}
