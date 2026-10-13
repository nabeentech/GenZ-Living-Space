import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { signToken, COOKIE_NAME } from "@/lib/auth";
import { getAppOrigin } from "@/lib/url";

export const dynamic = "force-dynamic";

const ROLE_REDIRECTS: Record<string, string> = {
  RECEPTIONIST: "/admin/receptionist",
  PROPERTY_MANAGER: "/admin/manager",
  SUPER_ADMIN: "/admin",
  FINANCE: "/admin",
  HOUSEKEEPING: "/admin",
  SUPPORT_STAFF: "/admin",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Determine application origin & redirect URI
  const origin = getAppOrigin(req);
  const redirectUri = `${origin}/api/auth/google/callback`;

  // Parse state to retrieve original destination
  let nextPath = "/dashboard";
  let stateCsrf = "";
  if (state) {
    try {
      const stateObj = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
      if (stateObj?.next && stateObj.next.startsWith("/") && !stateObj.next.startsWith("//")) {
        nextPath = stateObj.next;
      }
      if (stateObj?.csrf) {
        stateCsrf = stateObj.csrf;
      }
    } catch {
      // Keep default
    }
  }

  if (nextPath.startsWith("/auth/login") || nextPath.startsWith("/auth/register")) {
    nextPath = "/dashboard";
  }

  // 1. Check if user cancelled or Google returned an error
  if (error) {
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(error)}&next=${encodeURIComponent(nextPath)}`, origin)
    );
  }

  // 2. Validate CSRF state token
  const cookieStore = await cookies();
  const savedCsrf = cookieStore.get("google_oauth_csrf")?.value;
  cookieStore.delete("google_oauth_csrf");

  if (!stateCsrf || !savedCsrf || stateCsrf !== savedCsrf) {
    return NextResponse.redirect(
      new URL(`/auth/login?error=invalid_oauth_state&next=${encodeURIComponent(nextPath)}`, origin)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(`/auth/login?error=missing_oauth_code&next=${encodeURIComponent(nextPath)}`, origin)
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL(`/auth/login?error=google_not_configured&next=${encodeURIComponent(nextPath)}`, origin)
    );
  }

  try {
    // 3. Exchange authorization code for access and ID tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("Google Token Exchange Failed:", errText);
      return NextResponse.redirect(
        new URL(`/auth/login?error=token_exchange_failed&next=${encodeURIComponent(nextPath)}`, origin)
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 4. Fetch verified Google user profile
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoResponse.ok) {
      return NextResponse.redirect(
        new URL(`/auth/login?error=userinfo_fetch_failed&next=${encodeURIComponent(nextPath)}`, origin)
      );
    }

    const googleUser = await userInfoResponse.json();
    const email = googleUser.email?.toLowerCase().trim();
    const googleId = googleUser.sub;
    const name = googleUser.name || email?.split("@")[0] || "Resident";
    const avatarUrl = googleUser.picture || null;

    if (!email) {
      return NextResponse.redirect(
        new URL(`/auth/login?error=email_not_provided&next=${encodeURIComponent(nextPath)}`, origin)
      );
    }

    // 5. Find or create user in SQLite database
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId }, { email }],
      },
    });

    if (user) {
      // Account exists: link Google ID if missing, or update avatar if empty
      const updateData: any = {};
      if (!user.googleId) updateData.googleId = googleId;
      if (!user.avatarUrl && avatarUrl) updateData.avatarUrl = avatarUrl;

      if (Object.keys(updateData).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
      }
    } else {
      // New user: create customer account
      user = await prisma.user.create({
        data: {
          email,
          name,
          googleId,
          avatarUrl,
          role: "CUSTOMER",
          active: true,
        },
      });
    }

    // 6. Generate our standard JWT session token
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    // 7. Store JWT in HTTP-only session cookie (7 days)
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    // 8. Redirect to requested destination or role-based dashboard
    const destination = (user.role && ROLE_REDIRECTS[user.role]) || nextPath || "/dashboard";
    return NextResponse.redirect(new URL(destination, origin));
  } catch (err: any) {
    console.error("Google OAuth Callback Error:", err);
    return NextResponse.redirect(
      new URL(`/auth/login?error=oauth_internal_error&next=${encodeURIComponent(nextPath)}`, origin)
    );
  }
}
