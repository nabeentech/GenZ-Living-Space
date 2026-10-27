import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import { isDevAdminAuthenticated } from "@/lib/dev-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const isDev = await isDevAdminAuthenticated();
    if (!isDev) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Dev Admin master session required." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      clearBookings = true,
      resetBeds = true,
      clearCustomers = true,
      clearTicketsAndTasks = true,
      clearAuditLogs = true,
      resetCoupons = true,
    } = body;

    // 1. Create a safe backup of the database file first
    let backupCreated = false;
    let backupFileName = "";
    try {
      const dbPath = path.resolve(process.cwd(), "prisma", "dev.db");
      if (fs.existsSync(dbPath)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        backupFileName = `dev.db.backup.${timestamp}`;
        const backupPath = path.resolve(process.cwd(), "prisma", backupFileName);
        fs.copyFileSync(dbPath, backupPath);
        backupCreated = true;
      }
    } catch (bErr) {
      console.warn("Could not create filesystem database backup:", bErr);
    }

    // 2. Perform Transactional Cleanup
    const results: Record<string, number> = {};

    await prisma.$transaction(async (tx) => {
      if (clearBookings) {
        const delReviews = await tx.review.deleteMany({});
        const delExts = await tx.bookingExtension.deleteMany({});
        const delCharges = await tx.additionalCharge.deleteMany({});
        const delRefunds = await tx.refund.deleteMany({});
        const delPayments = await tx.payment.deleteMany({});
        const delInvoices = await tx.invoice.deleteMany({});
        const delBookings = await tx.booking.deleteMany({});

        results.reviews = delReviews.count;
        results.bookingExtensions = delExts.count;
        results.additionalCharges = delCharges.count;
        results.refunds = delRefunds.count;
        results.payments = delPayments.count;
        results.invoices = delInvoices.count;
        results.bookings = delBookings.count;
      }

      if (resetBeds) {
        const updBeds = await tx.bed.updateMany({
          data: {
            status: "AVAILABLE",
            currentOccupantId: null,
          },
        });
        results.bedsReset = updBeds.count;
      }

      if (clearCustomers) {
        const delCustomers = await tx.user.deleteMany({
          where: { role: "CUSTOMER" },
        });
        results.customersDeleted = delCustomers.count;
      }

      if (clearTicketsAndTasks) {
        const delTickets = await tx.supportTicket.deleteMany({});
        const delTasks = await tx.housekeepingTask.deleteMany({});
        results.supportTickets = delTickets.count;
        results.housekeepingTasks = delTasks.count;
      }

      if (clearAuditLogs) {
        const delLogs = await tx.auditLog.deleteMany({});
        results.auditLogs = delLogs.count;
      }

      if (resetCoupons) {
        const updCoupons = await tx.coupon.updateMany({
          data: { usedCount: 0 },
        });
        results.couponsReset = updCoupons.count;
      }
    });

    return NextResponse.json({
      success: true,
      message: "Database cleanup completed successfully. Platform is in a fresh, clean production-ready state.",
      data: {
        backupCreated,
        backupFileName,
        results,
      },
    });
  } catch (error: any) {
    console.error("Dev Handover cleanup error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to execute database cleanup" },
      { status: 500 }
    );
  }
}
