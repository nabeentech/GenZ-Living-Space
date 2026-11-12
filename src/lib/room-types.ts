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
  2: "double-sharing-type-1",
  3: "triple-sharing-type-1",
  4: "four-sharing",
};

export const SHARING_DESCRIPTIONS: Record<number, string> = {
  1: "Ultra-luxe private sanctuary for solo builders or founders. Includes king-size bed, private work nook, smart TV, and designer bath.",
  2: "Shared between two residents. Available in Type 1 (Ventilated with Window/Balcony) and Type 2 (Non-Ventilated Cozy Pods).",
  3: "Shared between three residents. Available in Type 1 (Ventilated with Window) and Type 2 (Non-Ventilated Interior).",
  4: "Shared room with 4 beds.",
};

export function getSharingName(capacity: number): string {
  return SHARING_NAMES[capacity] ?? `${capacity}-Bed Shared Room`;
}

export type RoomVariant = "TYPE_1" | "TYPE_2";

export interface RoomVariantDetails {
  variant: RoomVariant;
  name: string;
  shortLabel: string;
  badgeText: string;
  isVentilated: boolean;
}

/** Determine whether a room or room type is Type 1 (Ventilated) or Type 2 (Non-Ventilated) */
export function getRoomVariantInfo(roomOrType?: {
  roomType?: { name?: string; slug?: string } | null;
  name?: string;
  slug?: string;
} | null): RoomVariantDetails {
  const rt = roomOrType && "roomType" in roomOrType && roomOrType.roomType ? roomOrType.roomType : roomOrType;
  const name = rt?.name || "";
  const slug = rt?.slug || "";

  const isType2 = /type-?2|non-?ventilated/i.test(slug) || /type\s*2|non-?ventilated/i.test(name);
  if (isType2) {
    return {
      variant: "TYPE_2",
      name: "Type 2 · Non-Ventilated",
      shortLabel: "Type 2",
      badgeText: "🛋️ Non-Ventilated",
      isVentilated: false,
    };
  }

  return {
    variant: "TYPE_1",
    name: "Type 1 · Ventilated",
    shortLabel: "Type 1",
    badgeText: "🌤️ Ventilated",
    isVentilated: true,
  };
}

export function getRoomTypeSlug(capacity: number, variant: RoomVariant = "TYPE_1"): string {
  if (capacity === 2) {
    return variant === "TYPE_2" ? "double-sharing-type-2" : "double-sharing-type-1";
  }
  if (capacity === 3) {
    return variant === "TYPE_2" ? "triple-sharing-type-2" : "triple-sharing-type-1";
  }
  return SHARING_SLUGS[capacity] ?? `shared-room-${capacity}-bed`;
}

/** Return a room type whose bed count and variant match the room inventory. */
export async function getRoomTypeForCapacity(db: Db, capacity: number, variant: RoomVariant = "TYPE_1") {
  const slug = getRoomTypeSlug(capacity, variant);

  // First try to match exact slug
  const matchingBySlug = await db.roomType.findFirst({
    where: {
      OR: [
        { slug },
        // Fallback for legacy slug names
        ...(variant === "TYPE_1" && capacity === 2 ? [{ slug: "double-sharing" }] : []),
        ...(variant === "TYPE_1" && capacity === 3 ? [{ slug: "triple-sharing" }] : []),
      ],
      active: true,
    },
  });
  if (matchingBySlug) return matchingBySlug;

  // Then try to match any roomType with the same bed count
  const matchingByCapacity = await db.roomType.findFirst({
    where: { totalBeds: capacity, active: true },
    orderBy: { createdAt: "asc" },
  });
  if (matchingByCapacity) return matchingByCapacity;

  // Otherwise fallback to create default
  const daily = Math.max(299, Math.round(1499 / capacity));
  const acDaily = Math.round(daily * 1.2);
  const variantInfo = variant === "TYPE_2" ? "Type 2 - Non-Ventilated" : "Type 1 - Ventilated";

  return db.roomType.create({
    data: {
      name: `${getSharingName(capacity)} (${variantInfo})`,
      slug,
      description: `${getSharingName(capacity)} (${variantInfo}) with ${capacity} bed${capacity > 1 ? "s" : ""}.`,
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
