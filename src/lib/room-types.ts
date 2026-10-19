import { Prisma } from "@prisma/client";

type Db = Prisma.TransactionClient;

export const SHARING_NAMES: Record<number, string> = {
  1: "Single Sharing",
  2: "Double Sharing",
  3: "Triple Sharing",
  4: "Four Sharing",
};

export const SHARING_SLUGS: Record<number, string> = {
  1: "single-sharing",
  2: "double-sharing",
  3: "triple-sharing",
  4: "four-sharing",
};

export function getSharingName(capacity: number): string {
  return SHARING_NAMES[capacity] ?? `${capacity}-Bed Shared Room`;
}

/** Return a room type whose bed count matches the room inventory. */
export async function getRoomTypeForCapacity(db: Db, capacity: number) {
  const matching = await db.roomType.findFirst({
    where: { totalBeds: capacity, active: true },
    orderBy: { createdAt: "asc" },
  });
  if (matching) return matching;

  const slug = SHARING_SLUGS[capacity] ?? `shared-room-${capacity}-bed`;
  const existing = await db.roomType.findUnique({ where: { slug } });
  if (existing) {
    return db.roomType.update({
      where: { id: existing.id },
      data: { totalBeds: capacity, active: true },
    });
  }

  const daily = Math.max(299, Math.round(1499 / capacity));
  const acDaily = Math.round(daily * 1.2);
  return db.roomType.create({
    data: {
      name: getSharingName(capacity),
      slug,
      description: `${getSharingName(capacity)} with ${capacity} bed${capacity > 1 ? "s" : ""}.`,
      totalBeds: capacity,
      genderCategory: capacity === 1 ? "PRIVATE" : "MIXED",
      basePrice: daily,
      monthlyPrice: daily * 24,
      securityDeposit: 3000,
      pricePerDayNonAC: daily,
      price7DaysNonAC: Math.round(daily * 7 * 0.9),
      price10DaysNonAC: daily * 10,
      price15DaysNonAC: daily * 15,
      price30DaysNonAC: daily * 24,
      pricePerDayAC: acDaily,
      price7DaysAC: Math.round(acDaily * 7 * 0.9),
      price10DaysAC: acDaily * 10,
      price15DaysAC: acDaily * 15,
      price30DaysAC: acDaily * 24,
    },
  });
}
