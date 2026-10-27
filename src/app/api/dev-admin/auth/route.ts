import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  DEV_COOKIE_NAME,
  verifyDevPasscode,
  signDevSession,
  isDevAdminAuthenticated,
} from "@/lib/dev-auth";

export const dynamic = "force-dynamic";

// GET: Check active dev admin session
export async function GET() {
  const isAuth = await isDevAdminAuthenticated();
  return NextResponse.json({
    success: true,
    authenticated: isAuth,
  });
}

// POST: Verify Master Dev Key and login
export async function POST(req: Request) {
  try {
    const { passcode } = await req.json().catch(() => ({}));

    if (!passcode || typeof passcode !== "string") {
      return NextResponse.json(
        { success: false, message: "Developer master key is required" },
        { status: 400 }
      );
    }

    const isValid = verifyDevPasscode(passcode);
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: "Invalid Developer Master Key. Access denied." },
        { status: 401 }
      );
    }

    const token = signDevSession();
    (await cookies()).set({
      name: DEV_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    });

    return NextResponse.json({
      success: true,
      message: "Dev Admin terminal unlocked successfully",
    });
  } catch (error: any) {
    console.error("Dev auth error:", error);
    return NextResponse.json(
      { success: false, message: "Authentication failed" },
      { status: 500 }
    );
  }
}

// DELETE: Sign out / lock dev terminal
export async function DELETE() {
  (await cookies()).delete(DEV_COOKIE_NAME);
  return NextResponse.json({
    success: true,
    message: "Dev Admin terminal locked",
  });
}
