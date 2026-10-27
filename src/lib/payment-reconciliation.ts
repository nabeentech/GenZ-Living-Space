import type { Prisma, PrismaClient } from "@prisma/client";
import type { PhonePeOrderStatus } from "./phonepe";

type Dependencies = {
  db: PrismaClient;
  checkStatus: (id: string) => Promise<PhonePeOrderStatus>;
  generateQR: (reference: string, id: string) => Promise<string>;
  createInvoice: typeof import("./invoice").createInvoiceWithRetry;
  log: (event: string, details: Record<string, unknown>) => void;
};

export class PaymentFlowError extends Error {
  constructor(message: string, public readonly status = 409) { super(message); }
}

export async function paymentTransaction<T>(db: PrismaClient, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(work, { isolationLevel: "Serializable", maxWait: 5000, timeout: 15000 });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (attempt >= 2 || !["P2034", "P1008", "P2028"].includes(code || "")) throw error;
    }
  }
}

export function paymentMetadata(value: string | null): Record<string, any> {
  if (!value) return {};
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new PaymentFlowError("Invalid payment metadata");
  return parsed;
}

export function createPaymentReconciler(deps: Dependencies) {
  const { db, checkStatus, log } = deps;
  async function reconcile(merchantOrderId: string) {
    if (!/^[A-Za-z0-9_-]{1,63}$/.test(merchantOrderId)) throw new PaymentFlowError("Invalid order reference", 400);
    const payment = await db.payment.findFirst({ where: { gateway: "PHONEPE", gatewayOrderId: merchantOrderId } });
    if (!payment) throw new PaymentFlowError("Payment transaction record not found", 404);
    // Completed/review records are already durably reconciled. Consult the
    // provider for every unresolved or legacy FAILED attempt; a historical
    // cleanup failure must not hide money subsequently received.
    if (["COMPLETED", "REVIEW_REQUIRED"].includes(payment.status) || (paymentMetadata(payment.metadata).initiationRejected === true && payment.status === "FAILED")) {
      const booking = await db.booking.findUniqueOrThrow({ where: { id: payment.bookingId } });
      return { state: payment.status, applied: false, bookingId: booking.id, bookingReference: booking.bookingReference, amount: payment.amount };
    }
    const provider = await checkStatus(merchantOrderId);
    const outcome = await paymentTransaction(db, async tx => {
      // Acquire SQLite's write lock before reading totals to avoid concurrent
      // read-then-upgrade deadlocks across return, webhook and cron workers.
      await tx.booking.update({ where: { id: payment.bookingId }, data: { updatedAt: new Date() } });
      const current = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
      const booking = await tx.booking.findUniqueOrThrow({ where: { id: current.bookingId }, include: { invoices: { orderBy: { createdAt: "asc" } } } });
      const result = (state: string, applied = false) => ({ state, applied, bookingId: booking.id, bookingReference: booking.bookingReference, amount: current.amount });
      if (current.status === "COMPLETED") return result("COMPLETED");
      if (current.status === "REVIEW_REQUIRED") return result("REVIEW_REQUIRED");
      if (provider.state !== "COMPLETED") {
        if (provider.state === "FAILED") {
          await tx.payment.updateMany({ where: { id: current.id, status: "PENDING" }, data: { status: "FAILED" } });
          return result("FAILED");
        }
        // Unknown states are never converted into a terminal failure.
        return result("PENDING");
      }
      const expectedPaise = Math.round(current.amount * 100);
      if (!Number.isSafeInteger(provider.amount) || provider.amount !== expectedPaise || expectedPaise < 100) {
        log("reconciliation.rejected", { merchantOrderId, reason: "AMOUNT_MISMATCH", expectedPaise, receivedPaise: provider.amount });
        throw new PaymentFlowError("Gateway payment amount does not match the expected amount");
      }
      const meta = paymentMetadata(current.metadata);
      if (meta.providerOrderId && meta.providerOrderId !== provider.orderId) throw new PaymentFlowError("Gateway order does not match the payment record");
      if (!provider.orderId) throw new PaymentFlowError("Missing provider order ID");
      const detail = provider.paymentDetails?.find(item => item.state === "COMPLETED");
      if (detail && detail.amount !== expectedPaise) throw new PaymentFlowError("Gateway attempt amount mismatch");
      const rent = meta.type === "MONTHLY_RENT";
      const cycleStart = rent ? new Date(meta.cycleStart) : null;
      const cycleEnd = rent ? new Date(meta.cycleEnd) : null;
      const invalidCycle = rent && (!cycleStart || !cycleEnd || !Number.isFinite(cycleStart.getTime()) || !Number.isFinite(cycleEnd.getTime()) || cycleEnd <= cycleStart || booking.checkOutDate.getTime() !== cycleStart.getTime());
      // A late or duplicate captured payment needs operator handling, never a
      // silent cap/discard or resurrection of a released/cancelled reservation.
      const needsReview = !["PAYMENT_PENDING", "CONFIRMED", "CHECKED_IN"].includes(booking.bookingStatus)
        || invalidCycle || (!rent && expectedPaise > Math.round((booking.totalAmount - booking.paidAmount) * 100));
      if (needsReview) {
        await tx.payment.update({ where: { id: current.id }, data: { status: "REVIEW_REQUIRED", metadata: JSON.stringify({ ...meta, providerOrderId: provider.orderId, transactionId: detail?.transactionId, reviewReason: "BOOKING_OR_CYCLE_CONFLICT" }) } });
        return result("REVIEW_REQUIRED", true);
      }
      const claimed = await tx.payment.updateMany({ where: { id: current.id, status: { in: ["PENDING", "FAILED"] } }, data: {
        status: "COMPLETED", gatewayPaymentId: detail?.transactionId || provider.orderId,
        paymentMethod: detail?.paymentMode || "PHONEPE",
        metadata: JSON.stringify({ ...meta, providerOrderId: provider.orderId }),
      } });
      if (!claimed.count) throw new PaymentFlowError("Payment changed concurrently; retry verification");
      // Read and update booking totals within the SAME serializable transaction.
      const paidAmount = Math.round((booking.paidAmount + current.amount) * 100) / 100;
      const totalAmount = Math.round((booking.totalAmount + (rent ? current.amount : 0)) * 100) / 100;
      const balanceAmount = Math.max(0, Math.round((totalAmount - paidAmount) * 100) / 100);
      const paymentStatus = balanceAmount === 0 ? "PAID" : "PARTIAL";
      if (rent) {
        const invoice = booking.invoices.find(item => item.id === meta.invoiceId);
        if (!invoice || invoice.status === "PAID" || Math.round(invoice.totalAmount * 100) !== expectedPaise) throw new PaymentFlowError("Rent invoice does not match this cycle payment");
        await tx.booking.update({ where: { id: booking.id }, data: { checkOutDate: cycleEnd!, paidAmount, totalAmount, balanceAmount, paymentStatus } });
        await tx.invoice.update({ where: { id: invoice.id }, data: { status: "PAID", paidAmount: current.amount, balanceDue: 0 } });
        await tx.bookingExtension.create({ data: { bookingId: booking.id, originalCheckOut: booking.checkOutDate, newCheckOut: cycleEnd!, additionalAmount: current.amount, status: "CONFIRMED" } });
      } else {
        await tx.booking.update({ where: { id: booking.id }, data: {
          bookingStatus: booking.bookingStatus === "CHECKED_IN" ? "CHECKED_IN" : "CONFIRMED",
          paidAmount, balanceAmount, paymentStatus, holdExpiresAt: null,
          qrCodeData: booking.qrCodeData || await deps.generateQR(booking.bookingReference, booking.id),
        } });
        if (booking.bookingStatus === "PAYMENT_PENDING") await tx.bed.update({ where: { id: booking.bedId }, data: { status: "RESERVED" } });
        if (booking.invoices.length) {
          let remainingPaise = expectedPaise;
          for (const invoice of booking.invoices) {
            if (invoice.status === "CANCELLED") continue;
            const duePaise = Math.max(0, Math.round(invoice.totalAmount * 100) - Math.round(invoice.paidAmount * 100));
            const appliedPaise = Math.min(remainingPaise, duePaise);
            if (!appliedPaise) continue;
            const invoicePaid = Math.round(invoice.paidAmount * 100) + appliedPaise;
            const invoiceBalance = Math.round(invoice.totalAmount * 100) - invoicePaid;
            await tx.invoice.update({ where: { id: invoice.id }, data: {
              status: invoiceBalance === 0 ? "PAID" : "PARTIAL", paidAmount: invoicePaid / 100, balanceDue: invoiceBalance / 100,
            } });
            remainingPaise -= appliedPaise;
          }
          if (remainingPaise) throw new PaymentFlowError("Invoice balances do not match this payment; contact support");
        } else {
          await deps.createInvoice(tx, { bookingId: booking.id, customerId: booking.customerId, hostelId: booking.hostelId,
            baseAmount: booking.baseAmount, taxAmount: booking.taxAmount, serviceFee: booking.serviceFee,
            securityDeposit: booking.securityDeposit, discountAmount: booking.discountAmount,
            totalAmount, paidAmount, balanceDue: balanceAmount, status: paymentStatus });
        }
      }
      await tx.auditLog.create({ data: { userId: booking.customerId, action: "PHONEPE_PAYMENT_RECONCILED", entity: "Booking", entityId: booking.id,
        newValue: JSON.stringify({ merchantOrderId, providerOrderId: provider.orderId, amount: current.amount }) } });
      return result("COMPLETED", true);
    });
    log("reconciliation.result", { merchantOrderId, state: outcome.state, applied: outcome.applied });
    return outcome;
  }

  async function releaseExpiredHolds() {
    const deadline = Date.now() + 10000;
    const expired = await db.booking.findMany({ where: { bookingStatus: "PAYMENT_PENDING", holdExpiresAt: { lt: new Date() } }, select: { id: true }, orderBy: { updatedAt: "asc" }, take: 20 });
    let releasedCount = 0;
    let reconciledCount = 0;
    for (const booking of expired) {
      if (Date.now() > deadline) break;
      // Inspect ALL attempts, not just the latest; a failed retry may conceal
      // an earlier captured or still-payable session.
      const attempts = await db.payment.findMany({ where: { bookingId: booking.id, gateway: "PHONEPE" } });
      let uncertain = false;
      for (const attempt of attempts) {
        if (Date.now() > deadline) { uncertain = true; break; }
        if (!attempt.gatewayOrderId || attempt.status === "REVIEW_REQUIRED") { uncertain = true; continue; }
        try {
          const outcome = await reconcile(attempt.gatewayOrderId);
          if (outcome.state === "COMPLETED") reconciledCount += outcome.applied ? 1 : 0;
          else if (outcome.state !== "FAILED") uncertain = true;
        } catch { uncertain = true; }
      }
      if (uncertain) {
        await db.booking.updateMany({ where: { id: booking.id, bookingStatus: "PAYMENT_PENDING" }, data: { updatedAt: new Date() } });
        log("hold.retained", { reason: "PAYMENT_UNCERTAIN", merchantOrderIds: attempts.map(item => item.gatewayOrderId) });
        continue;
      }
      const released = await paymentTransaction(db, async tx => {
        await tx.booking.updateMany({ where: { id: booking.id, bookingStatus: "PAYMENT_PENDING" }, data: { updatedAt: new Date() } });
        const current = await tx.booking.findUnique({ where: { id: booking.id }, include: { payments: true } });
        if (!current || current.bookingStatus !== "PAYMENT_PENDING" || !current.holdExpiresAt || current.holdExpiresAt > new Date()) return false;
        // An initiation racing cleanup inserts PENDING in a guarded transaction.
        if (current.payments.some(item => item.gateway === "PHONEPE" && item.status !== "FAILED")) return false;
        const changed = await tx.booking.updateMany({ where: { id: current.id, bookingStatus: "PAYMENT_PENDING", updatedAt: current.updatedAt }, data: { bookingStatus: "CANCELLED", paymentStatus: "FAILED", holdExpiresAt: null } });
        if (!changed.count) return false;
        const another = await tx.booking.findFirst({ where: { id: { not: current.id }, bedId: current.bedId, bookingStatus: { in: ["PAYMENT_PENDING", "CONFIRMED", "CHECKED_IN"] } } });
        if (!another) await tx.bed.updateMany({ where: { id: current.bedId, status: "RESERVED", currentOccupantId: current.customerId }, data: { status: "AVAILABLE", currentOccupantId: null } });
        return true;
      });
      if (released) { releasedCount++; log("hold.released", { merchantOrderIds: attempts.map(item => item.gatewayOrderId) }); }
    }
    return { reconciledCount, releasedCount };
  }
  return { reconcile, releaseExpiredHolds };
}
