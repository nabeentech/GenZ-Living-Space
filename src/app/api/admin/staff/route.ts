import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hashPassword, ROLES } from "@/lib/auth";
import { parsePermissions, DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Super Admin access required." },
        { status: 403 }
      );
    }

    const staffUsers = await prisma.user.findMany({
      where: {
        role: {
          not: "CUSTOMER",
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const staffWithParsedPermissions = staffUsers.map((u) => ({
      ...u,
      parsedPermissions: parsePermissions(u.permissions, u.role),
    }));

    return NextResponse.json({
      success: true,
      staff: staffWithParsedPermissions,
    });
  } catch (error) {
    console.error("Error fetching staff users:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch staff members" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Super Admin access required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, password, role, phone, permissions } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { success: false, message: "Name, email, password, and role are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already registered
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "A user with this email address already exists." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    // Format permissions JSON
    let permissionsString = "{}";
    if (permissions && typeof permissions === "object") {
      permissionsString = JSON.stringify(permissions);
    } else if (typeof permissions === "string" && permissions.trim()) {
      permissionsString = permissions;
    } else if (DEFAULT_ROLE_PERMISSIONS[role]) {
      permissionsString = JSON.stringify(DEFAULT_ROLE_PERMISSIONS[role]);
    }

    const newStaff = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role,
        phone: phone ? phone.trim() : null,
        active: true,
        permissions: permissionsString,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        permissions: true,
        createdAt: true,
      },
    });

    // Create Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          userId: sessionUser.id,
          userName: sessionUser.name,
          action: "STAFF_CREATED",
          entity: "User",
          entityId: newStaff.id,
          newValue: JSON.stringify({
            name: newStaff.name,
            email: newStaff.email,
            role: newStaff.role,
            permissions: permissionsString,
          }),
        },
      });
    } catch (auditErr) {
      console.warn("Audit log creation skipped:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `Staff account created successfully for ${newStaff.name}`,
      staff: {
        ...newStaff,
        parsedPermissions: parsePermissions(newStaff.permissions, newStaff.role),
      },
    });
  } catch (error) {
    console.error("Error creating staff user:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error creating staff member" },
      { status: 500 }
    );
  }
}
