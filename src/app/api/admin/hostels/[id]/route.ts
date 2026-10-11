import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user.role, [ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER])) return NextResponse.json({ success: false, message: "Owner or property manager access required" }, { status: 403 });
  try {
    const body = await req.json();
    const before = await prisma.hostel.findUnique({ where: { id: params.id }, select: { id: true, name: true, active: true } });
    if (!before) return NextResponse.json({ success: false, message: "Hostel not found." }, { status: 404 });
    if (typeof body.active === "boolean") {
      const hostel = await prisma.hostel.update({ where: { id: params.id }, data: { active: body.active } });
      await logAuditAction({ userId: user.id, userName: user.name, action: body.active ? "HOSTEL_ACTIVATED" : "HOSTEL_DEACTIVATED", entity: "Hostel", entityId: hostel.id, previousValue: { active: before.active }, newValue: { active: body.active } });
      return NextResponse.json({ success: true, data: hostel });
    }

    const name = String(body.name || "").trim();
    const city = String(body.city || "").trim();
    const state = String(body.state || "").trim();
    const address = String(body.address || "").trim();
    const postalCode = String(body.postalCode || "").trim();
    const contactPhone = String(body.contactPhone || "").trim();
    const contactEmail = String(body.contactEmail || "").trim().toLowerCase();
    if (!name || !city || !state || !address || !postalCode || !contactPhone || !contactEmail) return NextResponse.json({ success: false, message: "Complete all required hostel details." }, { status: 400 });
    const hostel = await prisma.hostel.update({ where: { id: params.id }, data: { name, city, state, address, postalCode, contactPhone, contactEmail, tagline: `${name} · ${city}`, description: `${name} in ${city}, ${state}.` } });
    await logAuditAction({ userId: user.id, userName: user.name, action: "HOSTEL_DETAILS_UPDATED", entity: "Hostel", entityId: hostel.id, previousValue: { name: before.name }, newValue: { name, city, state, address, contactPhone, contactEmail } });
    return NextResponse.json({ success: true, data: hostel });
  } catch (error) {
    console.error("Hostel update error:", error);
    return NextResponse.json({ success: false, message: "Could not update this hostel." }, { status: 500 });
  }
}
