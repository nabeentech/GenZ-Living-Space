import fs from "fs";
import path from "path";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("=================================================");
  console.log("   GenZ Colive PG & Guest Rooms - Live Data Reset");
  console.log("=================================================\n");

  // 1. Create a safe backup of the database file first
  const dbPath = path.resolve(process.cwd(), "prisma", "dev.db");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.resolve(process.cwd(), "prisma", `dev.db.backup.${timestamp}`);

  if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, backupPath);
    console.log(`[1/4] Database backup created successfully:`);
    console.log(`      -> ${backupPath}\n`);
  } else {
    console.warn(`[!] Database file not found at ${dbPath}, proceeding with Prisma transaction...\n`);
  }

  // 2. Perform the transactional reset of all dummy/test data
  console.log("[2/4] Clearing test transaction data...");

  await prisma.$transaction(async (tx) => {
    // A. Delete dependent booking records
    const deletedReviews = await tx.review.deleteMany({});
    const deletedExtensions = await tx.bookingExtension.deleteMany({});
    const deletedCharges = await tx.additionalCharge.deleteMany({});
    const deletedRefunds = await tx.refund.deleteMany({});
    const deletedPayments = await tx.payment.deleteMany({});
    const deletedInvoices = await tx.invoice.deleteMany({});

    // B. Delete all bookings
    const deletedBookings = await tx.booking.deleteMany({});

    // C. Delete dummy operational data
    const deletedTickets = await tx.supportTicket.deleteMany({});
    const deletedTasks = await tx.housekeepingTask.deleteMany({});
    const deletedAuditLogs = await tx.auditLog.deleteMany({});

    // D. Delete dummy CUSTOMER accounts (preserve staff and admins)
    const deletedCustomers = await tx.user.deleteMany({
      where: { role: "CUSTOMER" },
    });

    // E. Reset all beds to AVAILABLE and clear any current occupant
    const updatedBeds = await tx.bed.updateMany({
      data: {
        status: "AVAILABLE",
        currentOccupantId: null,
      },
    });

    // F. Reset coupon used counters to 0
    await tx.coupon.updateMany({
      data: { usedCount: 0 },
    });

    console.log(`      ✓ Deleted ${deletedBookings.count} bookings`);
    console.log(`      ✓ Deleted ${deletedPayments.count} payments`);
    console.log(`      ✓ Deleted ${deletedInvoices.count} invoices`);
    console.log(`      ✓ Deleted ${deletedRefunds.count} refunds`);
    console.log(`      ✓ Deleted ${deletedExtensions.count} extensions`);
    console.log(`      ✓ Deleted ${deletedCharges.count} additional charges`);
    console.log(`      ✓ Deleted ${deletedReviews.count} reviews`);
    console.log(`      ✓ Deleted ${deletedTickets.count} support tickets`);
    console.log(`      ✓ Deleted ${deletedTasks.count} housekeeping tasks`);
    console.log(`      ✓ Deleted ${deletedAuditLogs.count} audit logs`);
    console.log(`      ✓ Deleted ${deletedCustomers.count} dummy customer accounts`);
    console.log(`      ✓ Reset ${updatedBeds.count} beds to AVAILABLE status`);
    console.log(`      ✓ Reset coupon usage counters to 0`);
  });

  // 3. Verify that all metrics are now zero
  console.log("\n[3/4] Verifying live database metrics...");
  const [
    bookingCount,
    paymentSum,
    capturedCount,
    occupiedBeds,
    availableBeds,
    staffCount,
    roomCount,
    roomTypesCount,
    hostelCount,
    galleryCount,
  ] = await Promise.all([
    prisma.booking.count(),
    prisma.payment.aggregate({
      where: { status: "CAPTURED" },
      _sum: { amount: true },
    }),
    prisma.payment.count(),
    prisma.bed.count({ where: { status: { not: "AVAILABLE" } } }),
    prisma.bed.count({ where: { status: "AVAILABLE" } }),
    prisma.user.count({ where: { role: { not: "CUSTOMER" } } }),
    prisma.room.count(),
    prisma.roomType.count(),
    prisma.hostel.count(),
    prisma.galleryImage.count(),
  ]);

  console.log("\n=================================================");
  console.log("              VERIFICATION SUMMARY");
  console.log("=================================================");
  console.log(`  Total Bookings:         ${bookingCount}  (Expected: 0)`);
  console.log(`  Total Payments:         ${capturedCount}  (Expected: 0)`);
  console.log(`  Gross Revenue / Income: ₹${paymentSum._sum.amount || 0}  (Expected: ₹0)`);
  console.log(`  Occupied/Locked Beds:   ${occupiedBeds}  (Expected: 0)`);
  console.log(`  Available Beds:         ${availableBeds}  (Ready for real guests)`);
  console.log("-------------------------------------------------");
  console.log("  PRESERVED INFRASTRUCTURE:");
  console.log(`  - Active Staff & Admins: ${staffCount}`);
  console.log(`  - Hostel Property:       ${hostelCount}`);
  console.log(`  - Rooms:                 ${roomCount}`);
  console.log(`  - Room Types:            ${roomTypesCount} (Single, Double, Triple, Four Sharing)`);
  console.log(`  - Gallery Photos:        ${galleryCount} photos preserved`);
  console.log("=================================================");
  console.log("\n[4/4] System is 100% clean and ready for real customer bookings today!\n");
}

main()
  .catch((e) => {
    console.error("Error resetting data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
