import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { TABLE_DEFINITIONS } from "@/lib/database-studio";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    table: string;
  }>;
}

// GET: Fetch paginated, searchable rows for a selected table
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Super Admin access required." },
        { status: 403 }
      );
    }

    const { table } = await params;
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

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(5, parseInt(url.searchParams.get("limit") || "25", 10)));
    const search = url.searchParams.get("search")?.trim() || "";
    const sortBy = url.searchParams.get("sortBy") || def.sortField || "id";
    const sortOrder = url.searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    const where: any = {};
    if (search && def.searchFields.length > 0) {
      where.OR = def.searchFields.map((field) => ({
        [field]: { contains: search },
      }));
    }

    const [total, rows] = await Promise.all([
      delegate.count({ where }),
      delegate.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { [sortBy]: sortOrder },
      }),
    ]);

    // Inspect first row or model to establish column headers
    const columns = rows.length > 0
      ? Object.keys(rows[0])
      : ["id", def.sortField];

    return NextResponse.json({
      success: true,
      data: {
        table: def,
        rows,
        columns,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error: any) {
    console.error("Database query error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to query table" },
      { status: 500 }
    );
  }
}

// DELETE: Delete single or multiple records by ID with cascade protection
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Super Admin access required." },
        { status: 403 }
      );
    }

    const { table } = await params;
    const def = TABLE_DEFINITIONS[table];
    if (!def) {
      return NextResponse.json(
        { success: false, message: `Unknown table '${table}'` },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawIds = body.ids || (body.id ? [body.id] : []);
    const ids: string[] = Array.isArray(rawIds) ? rawIds.map(String).filter(Boolean) : [];

    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, message: "At least one record ID must be provided" },
        { status: 400 }
      );
    }

    let deletedCount = 0;

    // Smart cascade handling based on table
    if (table === "booking") {
      await prisma.$transaction(async (tx) => {
        await tx.review.deleteMany({ where: { bookingId: { in: ids } } });
        await tx.bookingExtension.deleteMany({ where: { bookingId: { in: ids } } });
        await tx.additionalCharge.deleteMany({ where: { bookingId: { in: ids } } });
        await tx.refund.deleteMany({ where: { payment: { bookingId: { in: ids } } } });
        await tx.payment.deleteMany({ where: { bookingId: { in: ids } } });
        await tx.invoice.deleteMany({ where: { bookingId: { in: ids } } });

        // Reset any beds held/occupied by these bookings
        const bookings = await tx.booking.findMany({
          where: { id: { in: ids } },
          select: { bedId: true },
        });
        const bedIds = bookings.map((b) => b.bedId).filter(Boolean) as string[];
        if (bedIds.length > 0) {
          await tx.bed.updateMany({
            where: { id: { in: bedIds } },
            data: { status: "AVAILABLE", currentOccupantId: null },
          });
        }

        const res = await tx.booking.deleteMany({ where: { id: { in: ids } } });
        deletedCount = res.count;
      });
    } else if (table === "payment") {
      await prisma.$transaction(async (tx) => {
        await tx.refund.deleteMany({ where: { paymentId: { in: ids } } });
        const res = await tx.payment.deleteMany({ where: { id: { in: ids } } });
        deletedCount = res.count;
      });
    } else if (table === "user") {
      // Prevent deleting the currently authenticated Super Admin
      if (ids.includes(user.id)) {
        return NextResponse.json(
          { success: false, message: "Cannot delete your own active administrative account" },
          { status: 400 }
        );
      }

      await prisma.$transaction(async (tx) => {
        const userBookings = await tx.booking.findMany({
          where: { customerId: { in: ids } },
          select: { id: true, bedId: true },
        });
        const bIds = userBookings.map((b) => b.id);
        if (bIds.length > 0) {
          await tx.review.deleteMany({ where: { bookingId: { in: bIds } } });
          await tx.bookingExtension.deleteMany({ where: { bookingId: { in: bIds } } });
          await tx.additionalCharge.deleteMany({ where: { bookingId: { in: bIds } } });
          await tx.refund.deleteMany({ where: { payment: { bookingId: { in: bIds } } } });
          await tx.payment.deleteMany({ where: { bookingId: { in: bIds } } });
          await tx.invoice.deleteMany({ where: { bookingId: { in: bIds } } });
          const bedIds = userBookings.map((b) => b.bedId).filter(Boolean) as string[];
          if (bedIds.length > 0) {
            await tx.bed.updateMany({
              where: { id: { in: bedIds } },
              data: { status: "AVAILABLE", currentOccupantId: null },
            });
          }
          await tx.booking.deleteMany({ where: { id: { in: bIds } } });
        }
        await tx.supportTicket.deleteMany({ where: { customerId: { in: ids } } });
        await tx.auditLog.deleteMany({ where: { userId: { in: ids } } });
        const res = await tx.user.deleteMany({ where: { id: { in: ids } } });
        deletedCount = res.count;
      });
    } else if (table === "bed") {
      await prisma.$transaction(async (tx) => {
        // Disconnect or prevent deleting beds with active bookings
        const activeBookings = await tx.booking.count({
          where: { bedId: { in: ids }, bookingStatus: { in: ["CONFIRMED", "CHECKED_IN", "PAYMENT_PENDING"] } },
        });
        if (activeBookings > 0) {
          throw new Error("Cannot delete bed with active or upcoming reservations. Delete the booking first.");
        }
        await tx.booking.deleteMany({ where: { bedId: { in: ids } } });
        const res = await tx.bed.deleteMany({ where: { id: { in: ids } } });
        deletedCount = res.count;
      });
    } else {
      // Standard generic delete
      const delegate = (prisma as any)[table];
      const res = await delegate.deleteMany({ where: { id: { in: ids } } });
      deletedCount = res.count;
    }

    // Record audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userName: user.name || "Super Admin",
        action: `DELETE_${table.toUpperCase()}`,
        entity: table,
        entityId: ids.join(",").slice(0, 100),
        newValue: JSON.stringify({ deletedCount, requestedIdsCount: ids.length }),
      },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedCount} record(s) from '${def.name}'`,
      data: { deletedCount },
    });
  } catch (error: any) {
    console.error("Database deletion error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete record(s)" },
      { status: 500 }
    );
  }
}
