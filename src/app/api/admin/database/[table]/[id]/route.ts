import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { TABLE_DEFINITIONS } from "@/lib/database-studio";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    table: string;
    id: string;
  }>;
}

// GET: Fetch full single record
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Super Admin access required." },
        { status: 403 }
      );
    }

    const { table, id } = await params;
    const def = TABLE_DEFINITIONS[table];
    if (!def) {
      return NextResponse.json(
        { success: false, message: `Unknown table '${table}'` },
        { status: 404 }
      );
    }

    const delegate = (prisma as any)[table];
    if (!delegate) {
      return NextResponse.json(
        { success: false, message: `Prisma delegate for '${table}' not found` },
        { status: 404 }
      );
    }

    // Determine smart relations for detailed inspection
    let include: any = undefined;
    if (table === "booking") {
      include = { hostel: true, room: true, bed: true, payments: true, invoices: true, extensions: true };
    } else if (table === "room") {
      include = { hostel: true, roomType: true, beds: true };
    } else if (table === "bed") {
      include = { room: true };
    } else if (table === "user") {
      include = { bookings: { take: 5 }, payments: { take: 5 } };
    } else if (table === "payment") {
      include = { booking: true, refunds: true };
    }

    const record = await delegate.findUnique({
      where: { id },
      ...(include ? { include } : {}),
    });

    if (!record) {
      return NextResponse.json(
        { success: false, message: "Record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: record,
    });
  } catch (error: any) {
    console.error("Database fetch record error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load record details" },
      { status: 500 }
    );
  }
}

// PATCH: Update specific fields of a record
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Super Admin access required." },
        { status: 403 }
      );
    }

    const { table, id } = await params;
    const def = TABLE_DEFINITIONS[table];
    if (!def) {
      return NextResponse.json(
        { success: false, message: `Unknown table '${table}'` },
        { status: 404 }
      );
    }

    const delegate = (prisma as any)[table];
    if (!delegate) {
      return NextResponse.json(
        { success: false, message: `Prisma delegate for '${table}' not found` },
        { status: 404 }
      );
    }

    const updates = await req.json();
    if (!updates || typeof updates !== "object") {
      return NextResponse.json(
        { success: false, message: "Payload must be an object of fields to update" },
        { status: 400 }
      );
    }

    // Protect primary key and timestamps from manual corruption
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (["id", "createdAt", "updatedAt"].includes(key)) continue;

      // Handle type casting where needed
      if (typeof value === "string") {
        // Parse ISO dates if applicable
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
          const d = new Date(value);
          if (!isNaN(d.getTime())) {
            sanitized[key] = d;
            continue;
          }
        }
      }
      sanitized[key] = value;
    }

    const updated = await delegate.update({
      where: { id },
      data: sanitized,
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userName: user.name || "Super Admin",
        action: `UPDATE_${table.toUpperCase()}`,
        entity: table,
        entityId: id,
        newValue: JSON.stringify({ fields: Object.keys(sanitized) }),
      },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      message: `Record '${id}' in '${def.name}' updated successfully`,
      data: updated,
    });
  } catch (error: any) {
    console.error("Database update record error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update record" },
      { status: 500 }
    );
  }
}
