import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const hostelSlug = searchParams.get("hostelSlug");
    const hostelId = searchParams.get("hostelId");
    const featured = searchParams.get("featured");
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const where: any = {};

    if (category && category !== "ALL") {
      where.category = category;
    }

    if (featured === "true") {
      where.isFeatured = true;
    }

    if (hostelSlug) {
      where.hostel = { slug: hostelSlug };
    } else if (hostelId && hostelId !== "all") {
      where.hostelId = hostelId;
    }

    const images = await prisma.galleryImage.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        mimeType: true,
        fileSize: true,
        isFeatured: true,
        sortOrder: true,
        createdAt: true,
        hostelId: true,
        imageUrl: true,
        hostel: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
          },
        },
      },
      orderBy: [
        { isFeatured: "desc" },
        { sortOrder: "asc" },
        { createdAt: "desc" },
      ],
      take: limit,
    });

    const formatted = images.map((img) => ({
      ...img,
      src: `/api/gallery/image/${img.id}`,
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
    });
  } catch (error: any) {
    console.error("Gallery API error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch gallery images" },
      { status: 500 }
    );
  }
}
