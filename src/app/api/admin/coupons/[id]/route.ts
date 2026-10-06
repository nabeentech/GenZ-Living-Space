import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, [ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER])) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const couponId = params.id;
    const { active } = await req.json();

    const coupon = await prisma.coupon.update({
      where: { id: couponId },
      data: { active },
    });

    return NextResponse.json({
      success: true,
      message: `Coupon ${active ? "activated" : "deactivated"}`,
      data: coupon,
    });
  } catch (error: any) {
    console.error("Coupon toggle error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to toggle coupon" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, [ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER])) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const couponId = params.id;

    // Check if coupon has been used
    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      return NextResponse.json({ success: false, message: "Coupon not found" }, { status: 404 });
    }

    if (coupon.usedCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot delete coupon that has been used ${coupon.usedCount} times. Deactivate instead.`,
        },
        { status: 400 }
      );
    }

    await prisma.coupon.delete({
      where: { id: couponId },
    });

    return NextResponse.json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error: any) {
    console.error("Coupon delete error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete coupon" },
      { status: 500 }
    );
  }
}
