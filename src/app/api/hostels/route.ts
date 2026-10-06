import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const hostels = await prisma.hostel.findMany({
      where: { active: true },
      include: {
        amenities: { include: { amenity: true } },
        rooms: {
          include: {
            roomType: true,
            beds: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: hostels });
  } catch (error: any) {
    console.error("Hostels fetch error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch hostels" },
      { status: 500 }
    );
  }
}
