import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import {
  getGalleryCategories,
  saveGalleryCategories,
  GalleryCategoryItem,
} from "@/lib/gallery-categories";

export const dynamic = "force-dynamic";

// GET: Fetch current gallery categories
export async function GET() {
  try {
    const categories = await getGalleryCategories();
    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    console.error("GET gallery categories error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

// POST / PUT: Update the gallery categories list
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, [ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER])) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { categories } = body;

    if (!Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json(
        { success: false, message: "Categories must be a non-empty array" },
        { status: 400 }
      );
    }

    const saved = await saveGalleryCategories(categories);
    return NextResponse.json({
      success: true,
      message: "Gallery categories updated successfully",
      categories: saved,
    });
  } catch (error: any) {
    console.error("POST gallery categories error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to save categories" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  return POST(req);
}
