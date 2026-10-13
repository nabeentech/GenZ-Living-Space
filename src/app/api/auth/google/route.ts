import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const { searchParams } = new URL(req.url);
  const nextParam = searchParams.get("next") || "/dashboard";
  let safeNext = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";
  if (safeNext.startsWith("/auth/login") || safeNext.startsWith("/auth/register")) {
    safeNext = "/dashboard";
  }

  // If Google OAuth credentials are not configured yet
  if (!clientId || clientId === "your-google-client-id.apps.googleusercontent.com") {
    return NextResponse.redirect(
      new URL(`/auth/login?error=google_not_configured&next=${encodeURIComponent(safeNext)}`, req.url)
    );
  }

  // Determine application origin
  const reqUrl = new URL(req.url);
  const origin = process.env.NEXT_PUBLIC_APP_URL?.trim() || `${reqUrl.protocol}//${reqUrl.host}`;
  const redirectUri = `${origin}/api/auth/google/callback`;

  // CSRF protection: generate unique state containing target redirect
  const csrf = crypto.randomBytes(16).toString("hex");
  const stateData = {
    csrf,
    next: safeNext,
  };
  const state = Buffer.from(JSON.stringify(stateData)).toString("base64url");

  // Save CSRF token in an HTTP-only cookie (10 min expiry)
  const cookieStore = await cookies();
  cookieStore.set("google_oauth_csrf", csrf, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("state", state);
  googleAuthUrl.searchParams.set("access_type", "offline");
  googleAuthUrl.searchParams.set("prompt", "select_account");

  return NextResponse.redirect(googleAuthUrl.toString());
}
