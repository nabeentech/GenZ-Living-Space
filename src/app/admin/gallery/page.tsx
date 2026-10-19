import React from "react";
import prisma from "@/lib/prisma";
import GalleryClient from "./GalleryClient";
import { getGalleryCategories } from "@/lib/gallery-categories";

export const dynamic = "force-dynamic";

export default async function AdminGalleryPage() {
  const [images, hostels, totalCount, totalBytesResult, categories] = await Promise.all([
    prisma.galleryImage.findMany({
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
    getGalleryCategories(),
  ]);

  const formattedImages = images.map((img) => ({
    ...img,
    createdAt: img.createdAt.toISOString(),
    updatedAt: img.updatedAt.toISOString(),
    src: `/api/gallery/image/${img.id}`,
  }));

  return (
    <GalleryClient
      initialImages={formattedImages}
      hostels={hostels}
      initialCategories={categories}
      initialStats={{
        totalImages: totalCount,
        totalStorageBytes: totalBytesResult._sum.fileSize || 0,
      }}
    />
  );
}
