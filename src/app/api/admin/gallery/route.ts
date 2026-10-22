import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import { canUserEdit } from "@/lib/permissions";
import sharp from "sharp";

export const dynamic = "force-dynamic";

// GET: Fetch all gallery images for admin with storage stats
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, [ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER])) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const hostelId = searchParams.get("hostelId");

    const where: any = {};
    if (category && category !== "ALL") where.category = category;
    if (hostelId && hostelId !== "all") where.hostelId = hostelId;

    const [images, hostels, totalCount, totalBytesResult] = await Promise.all([
      prisma.galleryImage.findMany({
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
          updatedAt: true,
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
      }),
      prisma.hostel.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.galleryImage.count(),
      prisma.galleryImage.aggregate({
        _sum: {
          fileSize: true,
        },
      }),
    ]);

    const formatted = images.map((img) => ({
      ...img,
      src: `/api/gallery/image/${img.id}`,
    }));

    const formattedHostels = hostels.map((h) => ({
      ...h,
      name:
        !h.name || h.name === "Madhapur - 01" || h.name === "Madhapur 01"
          ? "GenZ Colive PG & Guest Rooms"
          : h.name,
    }));

    return NextResponse.json({
      success: true,
      data: {
        images: formatted,
        hostels: formattedHostels,
        stats: {
          totalImages: totalCount,
          totalStorageBytes: totalBytesResult._sum.fileSize || 0,
        },
      },
    });
  } catch (error: any) {
    console.error("Admin gallery fetch error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch gallery images" },
      { status: 500 }
    );
  }
}

// POST: Upload one or multiple images directly to the SQLite database
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, [ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER])) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    if (!canUserEdit(user)) {
      return NextResponse.json({ success: false, message: "You do not have permission to upload photos" }, { status: 403 });
    }

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const singleFile = formData.get("file") as File | null;
    const allFiles = files.length > 0 ? files : singleFile ? [singleFile] : [];

    if (allFiles.length === 0) {
      return NextResponse.json(
        { success: false, message: "No image file provided for upload" },
        { status: 400 }
      );
    }

    if (allFiles.length > 5) {
      return NextResponse.json(
        { success: false, message: "You can upload a maximum of 5 images per batch" },
        { status: 400 }
      );
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
    for (const file of allFiles) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, message: `File "${file.name}" exceeds the maximum allowed size of 5MB` },
          { status: 413 }
        );
      }
    }

    const customTitle = formData.get("title") as string | null;
    const description = (formData.get("description") as string) || "";
    const category = (formData.get("category") as string) || "COMMON_AREA";
    const rawHostelId = formData.get("hostelId") as string | null;
    const hostelId = rawHostelId && rawHostelId !== "all" && rawHostelId !== "" ? rawHostelId : null;
    const isFeatured = formData.get("isFeatured") === "true";

    const createdRecords = [];

    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];

      // Validate mime type
      if (!file.type.startsWith("image/")) {
        continue;
      }

      const arrayBuffer = await file.arrayBuffer();
      const inputBuffer = Buffer.from(arrayBuffer);

      let finalBuffer: Buffer = inputBuffer;
      let finalMimeType = "image/webp";

      try {
        // Optimize and convert to WebP (auto-rotate EXIF, max dimension 2560px, 82% quality)
        finalBuffer = await sharp(inputBuffer)
          .rotate()
          .resize({
            width: 2560,
            height: 2560,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 82, effort: 4 })
          .toBuffer();
      } catch (sharpError) {
        console.warn("Sharp WebP optimization failed, saving raw buffer fallback:", sharpError);
        finalBuffer = inputBuffer;
        finalMimeType = file.type || "image/jpeg";
      }

      // Do not use file name as title. Only use custom title if explicitly provided, else leave empty.
      const itemTitle =
        allFiles.length === 1 && customTitle && customTitle.trim()
          ? customTitle.trim()
          : "";

      const created = await prisma.galleryImage.create({
        data: {
          title: itemTitle,
          description: description || null,
          category,
          hostelId,
          isFeatured: allFiles.length === 1 ? isFeatured : false,
          mimeType: finalMimeType,
          fileSize: finalBuffer.length,
          imageData: finalBuffer, // Store optimized WebP binary directly in SQLite BLOB!
          imageUrl: null,
        },
        select: {
          id: true,
          title: true,
          category: true,
          fileSize: true,
          mimeType: true,
          createdAt: true,
        },
      });

      createdRecords.push(created);
    }

    if (createdRecords.length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid image files could be processed" },
        { status: 400 }
      );
    }

    // Record audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          userName: user.name,
          action: "UPLOAD_GALLERY_IMAGES",
          entity: "GalleryImage",
          entityId: createdRecords[0].id,
          newValue: JSON.stringify({
            count: createdRecords.length,
            category,
            hostelId,
          }),
        },
      });
    } catch (auditErr) {
      console.warn("Failed to create audit log for gallery upload:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${createdRecords.length} photo(s) into database`,
      data: createdRecords,
    });
  } catch (error: any) {
    console.error("Admin gallery upload error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to upload image to database" },
      { status: 500 }
    );
  }
}
