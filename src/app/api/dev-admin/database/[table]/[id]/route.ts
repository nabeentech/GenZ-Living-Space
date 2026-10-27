import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isDevAdminAuthenticated } from "@/lib/dev-auth";
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
    const isDev = await isDevAdminAuthenticated();
    if (!isDev) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Dev Admin master session required." },
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
    const isDev = await isDevAdminAuthenticated();
    if (!isDev) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Dev Admin master session required." },
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

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (["id", "createdAt", "updatedAt"].includes(key)) continue;

      if (typeof value === "string") {
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
