import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "genz_dev_default_secret_jwt_2026_secure";
export const DEV_COOKIE_NAME = "genz_dev_admin_session";

export function getDevAdminMasterKey(): string {
  return process.env.DEV_ADMIN_KEY || "genz_dev_master_2026";
}

export function verifyDevPasscode(passcode: string): boolean {
  const masterKey = getDevAdminMasterKey();
  return passcode.trim() === masterKey.trim();
}

export function signDevSession(): string {
  return jwt.sign(
    { role: "DEV_ADMIN", isDev: true, issuedAt: Date.now() },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
}

export function verifyDevSession(token: string): boolean {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded?.role === "DEV_ADMIN" && decoded?.isDev === true;
  } catch {
    return false;
  }
}

export async function isDevAdminAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(DEV_COOKIE_NAME)?.value;
    if (!token) return false;
    return verifyDevSession(token);
  } catch {
    return false;
  }
}
