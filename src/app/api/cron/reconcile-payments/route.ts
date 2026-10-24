import { NextResponse } from "next/server";
import { releaseExpiredBookingHolds } from "@/lib/booking-cleanup";
import prisma from "@/lib/prisma";
import { checkOrderStatus, isPhonePeConfigured } from "@/lib/phonepe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Background Payment Reconciler Cron
 * Can be called by Vercel cron, system cron, or periodic monitoring.
 * 1. Checks any PENDING PhonePe payments created in the last 2 hours.
 * 2. Reconciles expired holds with PhonePe before cancelling.
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is configured, enforce security header
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, message: "Unauthorized cron call" }, { status: 401 });
    }

    // 1. Reconcile holds
    const holdResults = await releaseExpiredBookingHolds();

    // 2. Poll recent pending payments (between 2 mins and 120 mins old)
    let polledCount = 0;
    let autoCompletedCount = 0;

    if (isPhonePeConfigured()) {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const twoHoursAgo = new Date(Date.now() - 120 * 60 * 1000);

      const pendingPayments = await prisma.payment.findMany({
        where: {
          gateway: "PHONEPE",
          status: "PENDING",
          createdAt: {
            gte: twoHoursAgo,
            lte: twoMinutesAgo,
          },
        },
        take: 20,
      });

      for (const payment of pendingPayments) {
        if (!payment.gatewayOrderId) continue;
        polledCount++;
        try {
          const status = await checkOrderStatus(payment.gatewayOrderId);
          if (status.state === "COMPLETED") {
            autoCompletedCount++;
          }
        } catch (err) {
          console.warn(`Cron poll failed for order ${payment.gatewayOrderId}:`, err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      holdsReconciled: holdResults.reconciledCount,
      holdsReleased: holdResults.releasedCount,
      pendingPaymentsPolled: polledCount,
      paymentsCompleted: autoCompletedCount,
    });
  } catch (error: any) {
    console.error("Payment reconciler cron error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Cron reconciliation failed" },
      { status: 500 }
    );
  }
}
