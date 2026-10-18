import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";

export const dynamic = "force-dynamic";

// DELETE: Remove image completely from the SQLite database
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, [ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER])) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const existing = await prisma.galleryImage.findUnique({
      where: { id },
      select: { id: true, title: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, message: "Image not found" }, { status: 404 });
    }

    await prisma.galleryImage.delete({
      where: { id },
    });

    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          userName: user.name,
          action: "DELETE_GALLERY_IMAGE",
          entity: "GalleryImage",
          entityId: id,
          previousValue: JSON.stringify(existing),
        },
      });
    } catch {
      // ignore audit log error
    }

    return NextResponse.json({
      success: true,
      message: "Image successfully deleted from database",
    });
  } catch (error: any) {
    console.error("Delete gallery image error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete image" },
      { status: 500 }
    );
  }
}

// PATCH: Update metadata of a gallery image
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, [ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER])) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, category, hostelId, isFeatured, sortOrder } = body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (hostelId !== undefined) {
      updateData.hostelId = hostelId && hostelId !== "all" ? hostelId : null;
    }
    if (isFeatured !== undefined) updateData.isFeatured = Boolean(isFeatured);
    if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder);

    const updated = await prisma.galleryImage.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        isFeatured: true,
        sortOrder: true,
        hostelId: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Image details updated successfully",
      data: updated,
    });
  } catch (error: any) {
    console.error("Update gallery image error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update image" },
      { status: 500 }
    );
  }
}
