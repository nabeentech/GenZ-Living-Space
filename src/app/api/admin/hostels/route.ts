import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user.role, [ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER])) return NextResponse.json({ success: false, message: "Owner or property manager access required" }, { status: 403 });
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const city = String(body.city || "").trim();
    const state = String(body.state || "").trim();
    const address = String(body.address || "").trim();
    const postalCode = String(body.postalCode || "").trim();
    const contactPhone = String(body.contactPhone || "").trim();
    const contactEmail = String(body.contactEmail || "").trim().toLowerCase();
    if (!name || !city || !state || !address || !postalCode || !contactPhone || !contactEmail) return NextResponse.json({ success: false, message: "Complete all required hostel details." }, { status: 400 });
    const slugBase = `${name}-${city}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
    const hostel = await prisma.hostel.create({
      data: {
        name, slug: `${slugBase}-${randomUUID().slice(0, 6)}`, city, state, address, postalCode,
        contactPhone, contactEmail, tagline: `${name} · ${city}`, description: `${name} in ${city}, ${state}.`, coverImage: "/hostel-placeholder.jpg",
      },
    });
    await logAuditAction({ userId: user.id, userName: user.name, action: "HOSTEL_CREATED", entity: "Hostel", entityId: hostel.id, newValue: { name, city, state } });
    return NextResponse.json({ success: true, data: hostel }, { status: 201 });
  } catch (error) {
    console.error("Hostel creation error:", error);
    return NextResponse.json({ success: false, message: "Could not add this hostel." }, { status: 500 });
  }
}
