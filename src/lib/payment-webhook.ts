import type { PrismaClient } from "@prisma/client";
import { PaymentFlowError } from "./payment-reconciliation";

type Dependencies = {
  db: PrismaClient;
  verify: (headers: { authorization?: string | null }, body: string) => boolean;
  reconcile: (id: string) => Promise<{ state: string }>;
  log: (event: string, details: Record<string, unknown>) => void;
};
export function createPhonePeWebhookHandler(deps: Dependencies) {
  return async function POST(req: Request) {
    const rawBody = await req.text();
    if (!deps.verify({ authorization: req.headers.get("authorization") }, rawBody)) {
      deps.log("webhook.rejected", { reason: "AUTHENTICATION_FAILED" });
      return Response.json({ success: false, message: "Invalid webhook authentication" }, { status: 401 });
    }
    let event;
    try { event = JSON.parse(rawBody); }
    catch { return Response.json({ success: false, message: "Malformed JSON" }, { status: 400 }); }
    if (!["checkout.order.completed", "checkout.order.failed"].includes(event?.event)) {
      return Response.json({ success: true, message: "Ignored event" });
    }
    const payload = event?.payload;
    if (typeof payload?.merchantOrderId !== "string" || !/^[A-Za-z0-9_-]{1,63}$/.test(payload.merchantOrderId)
      || !Number.isSafeInteger(payload.amount) || payload.amount < 100) {
      return Response.json({ success: false, message: "Invalid payment event" }, { status: 400 });
    }
    const merchantOrderId = payload.merchantOrderId;
    try {
      const payment = await deps.db.payment.findFirst({ where: { gateway: "PHONEPE", gatewayOrderId: merchantOrderId } });
      if (!payment) return Response.json({ success: true, message: "Unknown merchant order" });
      if (Math.round(payment.amount * 100) !== payload.amount) {
        deps.log("webhook.rejected", { merchantOrderId, reason: "AMOUNT_MISMATCH" });
        return Response.json({ success: false, message: "Payment amount mismatch" }, { status: 400 });
      }
      deps.log("webhook.received", { merchantOrderId, webhookEvent: event.event, amountPaise: payload.amount });
      // The webhook is an authenticated notification, not the source of booking
      // mutations. Re-read authoritative status so replays/delayed failure events
      // cannot overwrite a completed payment or credit a forged body.
      const outcome = await deps.reconcile(merchantOrderId);
      return Response.json({ success: true, received: true, state: outcome.state });
    } catch (error) {
      deps.log("webhook.retry", { merchantOrderId, reason: error instanceof PaymentFlowError ? "VALIDATION_FAILED" : "RECONCILIATION_UNAVAILABLE" });
      // Non-2xx asks PhonePe to retry; cron also picks up unresolved orders.
      return Response.json({ success: false, message: "Payment reconciliation pending; retry delivery." }, { status: 503 });
    }
  }

}
