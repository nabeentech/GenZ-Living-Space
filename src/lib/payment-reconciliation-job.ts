import type { PrismaClient } from "@prisma/client";

export async function reconcilePendingPhonePePayments(db: PrismaClient, reconcile: (id: string) => Promise<{ state: string; applied: boolean }>) {
  const pending = await db.payment.findMany({
    where: { gateway: "PHONEPE", gatewayOrderId: { not: null }, OR: [
      { status: "PENDING" },
      // Revisit recent legacy failures too; an earlier cleanup could have
      // incorrectly failed an order that subsequently received money.
      { status: "FAILED", createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) } },
    ] },
    orderBy: { updatedAt: "asc" }, take: 50,
  });
  const deadline = Date.now() + 10000;
  let polled = 0;
  let completed = 0;
  let errors = 0;
  for (const payment of pending) {
    if (Date.now() > deadline) break;
    polled++;
    try {
      const outcome = await reconcile(payment.gatewayOrderId!);
      if (outcome.state === "COMPLETED" && outcome.applied) completed++;
    } catch { errors++; }
    // Rotate unresolved attempts so a long provider outage cannot starve the
    // next batch. This never alters the payment state.
    await db.payment.updateMany({ where: { id: payment.id, status: { in: ["PENDING", "FAILED"] } }, data: { updatedAt: new Date() } });
  }
  return { polled, completed, errors };
}
