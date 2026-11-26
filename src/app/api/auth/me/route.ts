import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { getSessionUser, signToken, COOKIE_NAME } from "@/lib/auth";
import { isValidIndianMobile } from "@/lib/phone-validation";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, user: null }, { status: 401 });
  }
  return NextResponse.json({ success: true, user });
}

export async function PATCH(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      name,
      phone,
      gender,
      govtIdType,
      govtIdNumber,
      address,
      emergencyContact,
      avatarUrl,
    } = body;

    // Validate avatarUrl if provided
    let normalizedAvatarUrl: string | null | undefined = undefined;
    if (avatarUrl !== undefined) {
      if (avatarUrl === null || avatarUrl === "") {
        normalizedAvatarUrl = null;
      } else if (typeof avatarUrl === "string") {
        const trimmed = avatarUrl.trim();
        if (!trimmed.startsWith("data:image/") && !trimmed.startsWith("https://")) {
          return NextResponse.json(
            { success: false, message: "Invalid profile photo format." },
            { status: 400 }
          );
        }
        if (trimmed.length > 1_500_000) {
          return NextResponse.json(
            { success: false, message: "Profile photo is too large. Please upload a smaller photo." },
            { status: 400 }
          );
        }
        normalizedAvatarUrl = trimmed;
      } else {
        return NextResponse.json(
          { success: false, message: "Invalid profile photo value." },
          { status: 400 }
        );
      }
    }

    // Photo-only update path (when uploading/removing avatar directly)
    if (normalizedAvatarUrl !== undefined && name === undefined && phone === undefined) {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: normalizedAvatarUrl },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          avatarUrl: true,
          gender: true,
          govtIdType: true,
          govtIdNumber: true,
          address: true,
          emergencyContact: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: normalizedAvatarUrl
          ? "Profile photo updated successfully"
          : "Profile photo removed",
        data: { user: updatedUser },
      });
    }

    // Validate required fields for full profile update
    if (typeof name !== "string" || !name.trim() || name.trim().length > 100 || !isValidIndianMobile(phone)) {
      return NextResponse.json(
        { success: false, message: "Enter a name (up to 100 characters) and a valid 10-digit Indian mobile number." },
        { status: 400 }
      );
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name.trim(),
        phone,
        gender: gender || user.gender,
        govtIdType: govtIdType || user.govtIdType,
        govtIdNumber: govtIdNumber || user.govtIdNumber,
        address: address?.trim(),
        emergencyContact: emergencyContact?.trim(),
        ...(normalizedAvatarUrl !== undefined ? { avatarUrl: normalizedAvatarUrl } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatarUrl: true,
        gender: true,
        govtIdType: true,
        govtIdNumber: true,
        address: true,
        emergencyContact: true,
      },
    });

    // Issue a new token with updated info
    const newToken = signToken({
      userId: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      name: updatedUser.name,
    });

    (await cookies()).set({
      name: COOKIE_NAME,
      value: newToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      data: { user: updatedUser },
    });
  } catch (error: any) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update profile" },
      { status: 500 }
    );
  }
}
