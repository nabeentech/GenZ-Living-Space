import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { hashPassword, signToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { name, email, password, phone, gender, govtIdType, govtIdNumber } =
      await req.json().catch(() => ({}));

    if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { success: false, message: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = typeof phone === "string" ? phone.trim().replace(/[\s-]/g, "") : "";
    if (!normalizedName || normalizedName.length > 100) {
      return NextResponse.json({ success: false, message: "Name must be between 1 and 100 characters." }, { status: 400 });
    }
    if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ success: false, message: "Enter a valid email address." }, { status: 400 });
    }
    if (Buffer.byteLength(password, "utf8") < 8 || Buffer.byteLength(password, "utf8") > 72) {
      return NextResponse.json({ success: false, message: "Password must be at least 8 characters and no more than 72 bytes." }, { status: 400 });
    }
    if (!/^(?:\+91)?[6-9]\d{9}$/.test(normalizedPhone)) {
      return NextResponse.json({ success: false, message: "Enter a valid Indian mobile number." }, { status: 400 });
    }
    if (!gender || !["MALE", "FEMALE", "OTHER"].includes(gender)) {
      return NextResponse.json({ success: false, message: "Choose a valid gender option." }, { status: 400 });
    }
    if (govtIdNumber !== undefined && (typeof govtIdNumber !== "string" || govtIdNumber.length > 100)) {
      return NextResponse.json({ success: false, message: "Government ID must be 100 characters or fewer." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name: normalizedName,
        email: normalizedEmail,
        passwordHash,
        phone: normalizedPhone,
        gender,
        govtIdType,
        govtIdNumber,
        role: "CUSTOMER",
      },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    (await cookies()).set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    if (error?.code === "P2002") {
      return NextResponse.json({ success: false, message: "An account with this email already exists." }, { status: 409 });
    }
    return NextResponse.json(
      { success: false, message: error.message || "Registration failed" },
      { status: 500 }
    );
  }
}
