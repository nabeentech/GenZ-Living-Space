import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return new Response("Image ID is required", { status: 400 });
    }

    const image = await prisma.galleryImage.findUnique({
      where: { id },
      select: {
        imageData: true,
        mimeType: true,
        imageUrl: true,
        fileSize: true,
      },
    });

    if (!image) {
      return new Response("Image not found", { status: 404 });
    }

    // If stored as binary BLOB in database
    if (image.imageData && image.imageData.length > 0) {
      return new Response(new Uint8Array(image.imageData), {
        status: 200,
        headers: {
          "Content-Type": image.mimeType || "image/jpeg",
          "Content-Length": String(image.imageData.length),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // If external/fallback imageUrl was provided
    if (image.imageUrl) {
      return NextResponse.redirect(image.imageUrl, { status: 307 });
    }

    return new Response("No image content available", { status: 404 });
  } catch (error: any) {
    console.error("Error serving gallery image:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
