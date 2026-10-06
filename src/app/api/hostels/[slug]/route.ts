import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const hostel = await prisma.hostel.findUnique({
      where: { slug: params.slug },
      include: {
        amenities: { include: { amenity: true } },
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
      return NextResponse.json(
        { success: false, message: "Hostel not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: hostel });
  } catch (error: any) {
    console.error("Hostel detail fetch error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch hostel" },
      { status: 500 }
    );
  }
}
