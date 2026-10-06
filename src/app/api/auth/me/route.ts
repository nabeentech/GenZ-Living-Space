import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { getSessionUser, signToken, COOKIE_NAME } from "@/lib/auth";

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

    const { name, phone, gender, govtIdType, govtIdNumber, address, emergencyContact } = await req.json();

    // Validate required fields
    if (!name || !phone) {
      return NextResponse.json(
        { success: false, message: "Name and phone are required" },
        { status: 400 }
      );
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name.trim(),
        phone: phone.trim(),
        gender: gender || user.gender,
        govtIdType: govtIdType || user.govtIdType,
        govtIdNumber: govtIdNumber || user.govtIdNumber,
        address: address?.trim(),
        emergencyContact: emergencyContact?.trim(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
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

    cookies().set({
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
