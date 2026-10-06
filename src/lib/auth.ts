import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import prisma from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "genz_super_secret_jwt_key_2026";
const COOKIE_NAME = "genz_auth_token";

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function signToken(payload: {
  userId: string;
  email: string;
  role: string;
  name: string;
}): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): {
  userId: string;
  email: string;
  role: string;
  name: string;
} | null {
  try {
    return jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
      name: string;
    };
  } catch {
    return null;
  }
}

export async function getSessionUser() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload?.userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId, active: true },
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
      },
    });

    return user;
  } catch {
    return null;
  }
}

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  PROPERTY_MANAGER: "PROPERTY_MANAGER",
  RECEPTIONIST: "RECEPTIONIST",
  FINANCE: "FINANCE",
  HOUSEKEEPING: "HOUSEKEEPING",
  SUPPORT_STAFF: "SUPPORT_STAFF",
  CUSTOMER: "CUSTOMER",
} as const;

export function hasPermission(
  userRole: string,
  allowedRoles: string[]
): boolean {
  if (userRole === ROLES.SUPER_ADMIN) return true;
  return allowedRoles.includes(userRole);
}

export { COOKIE_NAME };
