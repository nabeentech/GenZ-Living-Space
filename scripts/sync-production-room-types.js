const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("--- Synchronizing Room Types for Production ---");

  // 1. Single Sharing (1 Bed)
  const single = await prisma.roomType.findFirst({
    where: { OR: [{ slug: "single-sharing" }, { totalBeds: 1 }] },
  });
  if (single) {
    await prisma.roomType.update({
      where: { id: single.id },
      data: {
        name: "Single Sharing",
        slug: "single-sharing",
        totalBeds: 1,
        active: true,
      },
    });
    console.log("✓ Single Sharing updated/verified.");
  }

  // 2. Double Sharing (Ventilated) (2 Beds, Type 1)
  let doubleType1 = await prisma.roomType.findFirst({
    where: {
      OR: [
        { slug: "double-sharing-type-1" },
        { slug: "double-sharing" },
        { name: { contains: "Twin Sharing" } },
      ],
    },
  });
  if (doubleType1) {
    await prisma.roomType.update({
      where: { id: doubleType1.id },
      data: {
        name: "Double Sharing (Ventilated)",
        slug: "double-sharing-type-1",
        description:
          "Shared between two residents with natural sunlight, fresh ventilation, and attached balcony/window opening.",
        totalBeds: 2,
        active: true,
      },
    });
    console.log("✓ Double Sharing (Ventilated) updated.");
  } else {
    doubleType1 = await prisma.roomType.create({
      data: {
        name: "Double Sharing (Ventilated)",
        slug: "double-sharing-type-1",
        description:
          "Shared between two residents with natural sunlight, fresh ventilation, and attached balcony/window opening.",
        totalBeds: 2,
        genderCategory: "MIXED",
        pricePerDayNonAC: 1099,
        price7DaysNonAC: 7090,
        price10DaysNonAC: 10190,
        price15DaysNonAC: 15285,
        price30DaysNonAC: 23999,
        pricePerDayAC: 1299,
        price7DaysAC: 8392,
        price10DaysAC: 11991,
        price15DaysAC: 17986,
        price30DaysAC: 27999,
        basePrice: 1099,
        weeklyDiscountPct: 10,
        securityDeposit: 4000,
        maintenanceFee: 2000,
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&auto=format&fit=crop&q=80",
        ]),
        amenities: JSON.stringify([
          "Work Desks",
          "Attached Balcony",
          "Ethernet Ports",
          "En-Suite Bath",
        ]),
        active: true,
      },
    });
    console.log("✓ Double Sharing (Ventilated) created.");
  }

  // 3. Double Sharing (Standard) (2 Beds, Type 2)
  const doubleType2 = await prisma.roomType.findFirst({
    where: { slug: "double-sharing-type-2" },
  });
  if (doubleType2) {
    await prisma.roomType.update({
      where: { id: doubleType2.id },
      data: {
        name: "Double Sharing (Standard)",
        slug: "double-sharing-type-2",
        description:
          "Shared between two residents. Quiet interior pod room without direct outdoor window, fully climate-controlled, cozy and pocket-friendly.",
        totalBeds: 2,
        active: true,
      },
    });
    console.log("✓ Double Sharing (Standard) updated.");
  } else {
    await prisma.roomType.create({
      data: {
        name: "Double Sharing (Standard)",
        slug: "double-sharing-type-2",
        description:
          "Shared between two residents. Quiet interior pod room without direct outdoor window, fully climate-controlled, cozy and pocket-friendly.",
        totalBeds: 2,
        genderCategory: "MIXED",
        pricePerDayNonAC: 999,
        price7DaysNonAC: 6390,
        price10DaysNonAC: 9190,
        price15DaysNonAC: 13785,
        price30DaysNonAC: 21999,
        pricePerDayAC: 1199,
        price7DaysAC: 7692,
        price10DaysAC: 10991,
        price15DaysAC: 16486,
        price30DaysAC: 25999,
        basePrice: 999,
        weeklyDiscountPct: 10,
        securityDeposit: 4000,
        maintenanceFee: 2000,
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&auto=format&fit=crop&q=80",
        ]),
        amenities: JSON.stringify([
          "Work Desks",
          "Cozy Pods",
          "Climate Control",
          "En-Suite Bath",
        ]),
        active: true,
      },
    });
    console.log("✓ Double Sharing (Standard) created.");
  }

  // 4. Triple Sharing (Spacious) (3 Beds, Type 1)
  let tripleType1 = await prisma.roomType.findFirst({
    where: {
      OR: [
        { slug: "triple-sharing-type-1" },
        { slug: "triple-sharing" },
        { name: { contains: "Triple" } },
      ],
    },
  });
  if (tripleType1) {
    await prisma.roomType.update({
      where: { id: tripleType1.id },
      data: {
        name: "Triple Sharing (Spacious)",
        slug: "triple-sharing-type-1",
        description:
          "Spacious triple-sharing room with extra space, comfortable beds, individual reading lamps, charging sockets, and personal lockers.",
        totalBeds: 3,
        active: true,
      },
    });
    console.log("✓ Triple Sharing (Spacious) updated.");
  } else {
    tripleType1 = await prisma.roomType.create({
      data: {
        name: "Triple Sharing (Spacious)",
        slug: "triple-sharing-type-1",
        description:
          "Spacious triple-sharing room with extra space, comfortable beds, individual reading lamps, charging sockets, and personal lockers.",
        totalBeds: 3,
        genderCategory: "MIXED",
        pricePerDayNonAC: 499,
        price7DaysNonAC: 3293,
        price10DaysNonAC: 4490,
        price15DaysNonAC: 6735,
        price30DaysNonAC: 11499,
        pricePerDayAC: 599,
        price7DaysAC: 3842,
        price10DaysAC: 5390,
        price15DaysAC: 8085,
        price30DaysAC: 13499,
        basePrice: 499,
        weeklyDiscountPct: 10,
        securityDeposit: 2500,
        maintenanceFee: 2000,
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&auto=format&fit=crop&q=80",
        ]),
        amenities: JSON.stringify([
          "Reading Lamp",
          "Charging Socket",
          "Locker",
          "Linen Included",
        ]),
        active: true,
      },
    });
    console.log("✓ Triple Sharing (Spacious) created.");
  }

  // 5. Triple Sharing (Standard) (3 Beds, Type 2)
  const tripleType2 = await prisma.roomType.findFirst({
    where: { slug: "triple-sharing-type-2" },
  });
  if (tripleType2) {
    await prisma.roomType.update({
      where: { id: tripleType2.id },
      data: {
        name: "Triple Sharing (Standard)",
        slug: "triple-sharing-type-2",
        description:
          "Comfortable triple-sharing room. Quiet interior setup with climate control, reading lamps, charging sockets, and personal lockers.",
        totalBeds: 3,
        active: true,
      },
    });
    console.log("✓ Triple Sharing (Standard) updated.");
  } else {
    await prisma.roomType.create({
      data: {
        name: "Triple Sharing (Standard)",
        slug: "triple-sharing-type-2",
        description:
          "Comfortable triple-sharing room. Quiet interior setup with climate control, reading lamps, charging sockets, and personal lockers.",
        totalBeds: 3,
        genderCategory: "MIXED",
        pricePerDayNonAC: 449,
        price7DaysNonAC: 2993,
        price10DaysNonAC: 4090,
        price15DaysNonAC: 6135,
        price30DaysNonAC: 10499,
        pricePerDayAC: 549,
        price7DaysAC: 3492,
        price10DaysAC: 4890,
        price15DaysAC: 7385,
        price30DaysAC: 12499,
        basePrice: 449,
        weeklyDiscountPct: 10,
        securityDeposit: 2500,
        maintenanceFee: 2000,
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&auto=format&fit=crop&q=80",
        ]),
        amenities: JSON.stringify([
          "Reading Lamp",
          "Charging Socket",
          "Locker",
          "Climate Control",
        ]),
        active: true,
      },
    });
    console.log("✓ Triple Sharing (Standard) created.");
  }

  // 6. Four Sharing (4 Beds)
  const four = await prisma.roomType.findFirst({
    where: { OR: [{ slug: "four-sharing" }, { totalBeds: 4 }] },
  });
  if (four) {
    await prisma.roomType.update({
      where: { id: four.id },
      data: {
        name: "Four Sharing",
        slug: "four-sharing",
        totalBeds: 4,
        active: true,
      },
    });
    console.log("✓ Four Sharing updated/verified.");
  }

  console.log("\n--- Final Room Types in DB ---");
  const all = await prisma.roomType.findMany({
    where: { active: true },
    select: { id: true, name: true, slug: true, totalBeds: true },
    orderBy: { totalBeds: "asc" },
  });
  console.table(all);
}

main()
  .catch((e) => {
    console.error("Error synchronizing room types:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
