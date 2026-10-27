import type { Payment, Prisma, PrismaClient } from "@prisma/client";
import { PaymentFlowError, paymentMetadata } from "./payment-reconciliation";
import { checkoutExpirySeconds, PhonePePaymentNotCreatedError, type CreatePaymentInput } from "./phonepe";

// A write before reads serializes initiation with cleanup and other attempts on
// SQLite. It runs inside paymentTransaction, which retries write conflicts.
export async function claimPhonePeAttempt(tx: Prisma.TransactionClient, bookingId: string, expectedCycleStart?: Date) {
  await tx.booking.update({ where: { id: bookingId }, data: { updatedAt: new Date() } });
  const booking = await tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
  if (!["PAYMENT_PENDING", "CONFIRMED", "CHECKED_IN"].includes(booking.bookingStatus)) throw new PaymentFlowError("Booking is not awaiting payment");
  if (booking.bookingStatus === "PAYMENT_PENDING") {
    if (!booking.holdExpiresAt) throw new PaymentFlowError("Booking hold is missing");
    try { checkoutExpirySeconds(booking.holdExpiresAt); }
    catch { throw new PaymentFlowError("Booking hold is too close to expiry; create a fresh booking", 410); }
  }
  if (expectedCycleStart && booking.checkOutDate.getTime() !== expectedCycleStart.getTime()) throw new PaymentFlowError("Rent cycle changed; refresh and retry");
  const unresolved = await tx.payment.findFirst({ where: { bookingId, gateway: "PHONEPE", status: { in: ["PENDING", "REVIEW_REQUIRED"] } } });
  if (unresolved) throw new PaymentFlowError("An earlier payment is awaiting verification. Check its status before starting another checkout.");
  return booking;
}

export function createPhonePeSender(db: PrismaClient, createPayment: (input: CreatePaymentInput) => Promise<{ orderId: string; state: string; expireAt: number; redirectUrl: string }>, log: (event: string, details: Record<string, unknown>) => void) {
  return async (record: Payment, input: CreatePaymentInput) => {
    try {
      const checkout = await createPayment(input);
      await db.payment.updateMany({ where: { id: record.id, status: "PENDING" }, data: {
        gatewayPaymentId: checkout.orderId,
        metadata: JSON.stringify({ ...paymentMetadata(record.metadata), providerOrderId: checkout.orderId, providerExpireAt: checkout.expireAt }),
      } });
      return checkout;
    } catch (error) {
      const notSent = error instanceof PhonePePaymentNotCreatedError;
      if (notSent) await db.payment.updateMany({ where: { id: record.id, status: "PENDING" }, data: {
        status: "FAILED", metadata: JSON.stringify({ ...paymentMetadata(record.metadata), initiationRejected: true }),
      } });
      log("checkout.initiation_failed", { merchantOrderId: input.merchantOrderId, outcome: notSent ? "NOT_SENT" : "UNCERTAIN" });
      // An error after dispatch may conceal an accepted session. Never turn
      // that uncertainty into a definite failure or open another payable order.
      throw error;
    }
  };
}
