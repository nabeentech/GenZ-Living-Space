import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hashPassword, ROLES } from "@/lib/auth";
import { parsePermissions } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Super Admin access required." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: "Staff user not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { name, phone, role, permissions, active, password } = body;

    // Safety: Cannot deactivate or demote oneself
    if (sessionUser.id === id) {
      if (active === false) {
        return NextResponse.json(
          { success: false, message: "You cannot deactivate your own Super Admin account." },
          { status: 400 }
        );
      }
      if (role && role !== ROLES.SUPER_ADMIN) {
        return NextResponse.json(
          { success: false, message: "You cannot change your own role from Super Admin." },
          { status: 400 }
        );
      }
    }

    // Safety: Ensure at least one active Super Admin exists
    if ((active === false || (role && role !== ROLES.SUPER_ADMIN)) && targetUser.role === ROLES.SUPER_ADMIN) {
      const activeSuperAdmins = await prisma.user.count({
        where: {
          role: ROLES.SUPER_ADMIN,
          active: true,
          id: { not: id },
        },
      });

      if (activeSuperAdmins === 0) {
        return NextResponse.json(
          { success: false, message: "Cannot modify or deactivate the only active Super Admin." },
          { status: 400 }
        );
      }
    }

    const updateData: {
      name?: string;
      phone?: string | null;
      role?: string;
      permissions?: string;
      active?: boolean;
      passwordHash?: string;
    } = {};

    if (name) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
    if (role) updateData.role = role;
    if (typeof active === "boolean") updateData.active = active;

    if (permissions !== undefined) {
      if (typeof permissions === "object") {
        updateData.permissions = JSON.stringify(permissions);
      } else if (typeof permissions === "string") {
        updateData.permissions = permissions;
      }
    }

    if (password && typeof password === "string" && password.trim().length >= 6) {
      updateData.passwordHash = await hashPassword(password.trim());
    }

    const updatedStaff = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        permissions: true,
        updatedAt: true,
      },
    });

    // Create Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          userId: sessionUser.id,
          userName: sessionUser.name,
          action: "STAFF_UPDATED",
          entity: "User",
          entityId: id,
          previousValue: JSON.stringify({
            name: targetUser.name,
            role: targetUser.role,
            active: targetUser.active,
            permissions: targetUser.permissions,
          }),
          newValue: JSON.stringify(updateData),
        },
      });
    } catch (auditErr) {
      console.warn("Audit log creation skipped:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `Updated permissions and account for ${updatedStaff.name}`,
      staff: {
        ...updatedStaff,
        parsedPermissions: parsePermissions(updatedStaff.permissions, updatedStaff.role),
      },
    });
  } catch (error) {
    console.error("Error updating staff user:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error updating staff member" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Super Admin access required." },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (sessionUser.id === id) {
      return NextResponse.json(
        { success: false, message: "You cannot delete your own Super Admin account." },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            bookings: true,
            payments: true,
            assignedTasks: true,
            supportTickets: true,
          },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: "Staff user not found" },
        { status: 404 }
      );
    }

    if (targetUser.role === ROLES.SUPER_ADMIN) {
      const remainingSuperAdmins = await prisma.user.count({
        where: {
          role: ROLES.SUPER_ADMIN,
          id: { not: id },
        },
      });
      if (remainingSuperAdmins === 0) {
        return NextResponse.json(
          { success: false, message: "Cannot delete the sole Super Admin account." },
          { status: 400 }
        );
      }
    }

    const hasRelations =
      targetUser._count.bookings > 0 ||
      targetUser._count.payments > 0 ||
      targetUser._count.assignedTasks > 0 ||
      targetUser._count.supportTickets > 0;

    if (hasRelations) {
      // Soft deactivate to prevent foreign key errors
      await prisma.user.update({
        where: { id },
        data: { active: false },
      });

      return NextResponse.json({
        success: true,
        message: `Staff member has historical records. Account has been deactivated to preserve audit trails.`,
      });
    }

    // Direct removal
    await prisma.user.delete({
      where: { id },
    });

    try {
      await prisma.auditLog.create({
        data: {
          userId: sessionUser.id,
          userName: sessionUser.name,
          action: "STAFF_DELETED",
          entity: "User",
          entityId: id,
          previousValue: JSON.stringify({
            name: targetUser.name,
            email: targetUser.email,
            role: targetUser.role,
          }),
        },
      });
    } catch (auditErr) {
      console.warn("Audit log creation skipped:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `Staff user deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting staff user:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error deleting staff user" },
      { status: 500 }
    );
  }
}
