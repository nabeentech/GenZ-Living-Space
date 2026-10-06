import prisma from "./prisma";

export async function releaseExpiredBookingHolds() {
  const result = await prisma.booking.updateMany({
    where: {
      bookingStatus: "PAYMENT_PENDING",
      holdExpiresAt: { lt: new Date() },
    },
    data: {
      bookingStatus: "CANCELLED",
      paymentStatus: "FAILED",
      holdExpiresAt: null,
    },
  });

  return result.count;
}