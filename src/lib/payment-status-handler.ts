import type { PrismaClient } from "@prisma/client";
import { PaymentFlowError } from "./payment-reconciliation";

type Dependencies = { db: PrismaClient; reconcile: (id: string) => Promise<{ state: string; bookingId: string; bookingReference: string; amount: number }> };
export function createCustomerPaymentStatus(deps: Dependencies) {
  return async function customerPhonePeStatus(merchantOrderId: unknown, user: { id: string } | null) {
    if (!user) return Response.json({ success: false, message: "Please sign in to verify payment." }, { status: 401 });
    if (typeof merchantOrderId !== "string" || !/^[A-Za-z0-9_-]{1,63}$/.test(merchantOrderId)) {
      return Response.json({ success: false, message: "Invalid order reference" }, { status: 400 });
    }
    const payment = await deps.db.payment.findFirst({ where: { gateway: "PHONEPE", gatewayOrderId: merchantOrderId, customerId: user.id } });
    if (!payment) return Response.json({ success: false, message: "Payment not found" }, { status: 404 });
    try {
      const result = await deps.reconcile(merchantOrderId);
      return Response.json({ ...result, success: result.state === "COMPLETED" || result.state === "PENDING",
        message: result.state === "COMPLETED" ? "Payment verified successfully." : result.state === "REVIEW_REQUIRED" ? "Payment received; booking requires support review." : result.state === "FAILED" ? "Payment failed. Please retry." : "Payment verification is pending." });
    } catch (error) {
      return Response.json({ success: false, message: error instanceof PaymentFlowError ? error.message : "Unable to verify payment; please retry shortly." }, { status: error instanceof PaymentFlowError ? error.status : 503 });
    }
  }

}
