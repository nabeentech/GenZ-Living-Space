import { NextResponse } from "next/server";
import { releaseExpiredBookingHolds, reconcilePhonePePayment } from "@/lib/booking-cleanup";
import { reconcilePendingPhonePePayments } from "@/lib/payment-reconciliation-job";
import prisma from "@/lib/prisma";
import { diagnostic } from "@/lib/phonepe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ success: false, message: "Payment cron is not configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  try {
    const payments = await reconcilePendingPhonePePayments(prisma, reconcilePhonePePayment);
    const holds = await releaseExpiredBookingHolds();
    const summary = { pendingPaymentsPolled: payments.polled, paymentsCompleted: payments.completed,
      reconciliationErrors: payments.errors, holdsReconciled: holds.reconciledCount, holdsReleased: holds.releasedCount };
    diagnostic("cron.result", summary);
    return NextResponse.json({ success: true, timestamp: new Date().toISOString(), ...summary });
  } catch {
    diagnostic("cron.error", { reason: "RECONCILIATION_UNAVAILABLE" });
    return NextResponse.json({ success: false, message: "Payment reconciliation unavailable" }, { status: 503 });
  }
}
