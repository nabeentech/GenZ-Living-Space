import prisma from "./prisma";
import { checkOrderStatus, isPhonePeConfigured } from "./phonepe";
import { generateBookingQRCode } from "./qr";
import { generateUniqueInvoiceNumber } from "./invoice";
import { logAuditAction } from "./audit";

export async function releaseExpiredBookingHolds(): Promise<{
  reconciledCount: number;
  releasedCount: number;
}> {
  const now = new Date();

  // Find all expired holds
  const expiredBookings = await prisma.booking.findMany({
    where: {
      bookingStatus: "PAYMENT_PENDING",
      holdExpiresAt: { lt: now },
    },
    include: {
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      bed: true,
      invoices: true,
    },
  });

  if (expiredBookings.length === 0) {
    return { reconciledCount: 0, releasedCount: 0 };
  }

  let reconciledCount = 0;
  let releasedCount = 0;

  for (const booking of expiredBookings) {
    const latestPayment = booking.payments[0];

    // 1. If customer initiated PhonePe checkout, verify authoritative gateway status before cancelling!
    if (
      latestPayment &&
      latestPayment.gateway === "PHONEPE" &&
      latestPayment.gatewayOrderId &&
      latestPayment.status === "PENDING" &&
      isPhonePeConfigured()
    ) {
      try {
        const phonePeStatus = await checkOrderStatus(latestPayment.gatewayOrderId);

        if (phonePeStatus.state === "COMPLETED") {
          // Money was debited! RECONCILE and CONFIRM instead of cancelling!
          const txnDetail = phonePeStatus.paymentDetails?.find((p) => p.state === "COMPLETED");
          const txnId = txnDetail?.transactionId || phonePeStatus.orderId;
          const paymentMode = txnDetail?.paymentMode || "PHONEPE_UPI";
          const qrCodeData = await generateBookingQRCode(booking.bookingReference, booking.id);
          const invoiceNumber = await generateUniqueInvoiceNumber();

          await prisma.$transaction(async (tx) => {
            await tx.payment.update({
              where: { id: latestPayment.id },
              data: {
                status: "COMPLETED",
                gatewayPaymentId: txnId,
                paymentMethod: paymentMode,
              },
            });

            await tx.booking.update({
              where: { id: booking.id },
              data: {
                bookingStatus: "CONFIRMED",
                paymentStatus: "PAID",
                paidAmount: booking.totalAmount,
                balanceAmount: 0,
                qrCodeData,
                holdExpiresAt: null,
              },
            });

            if (booking.bedId) {
              await tx.bed.update({
                where: { id: booking.bedId },
                data: { status: "RESERVED" },
              });
            }

            if (booking.invoices.length === 0) {
              await tx.invoice.create({
                data: {
                  invoiceNumber,
                  bookingId: booking.id,
                  customerId: booking.customerId,
                  hostelId: booking.hostelId,
                  issueDate: now,
                  dueDate: now,
                  baseAmount: booking.baseAmount,
                  taxAmount: booking.taxAmount,
                  serviceFee: booking.serviceFee,
                  securityDeposit: booking.securityDeposit,
                  discountAmount: booking.discountAmount,
                  totalAmount: booking.totalAmount,
                  paidAmount: booking.totalAmount,
                  balanceDue: 0,
                  status: "PAID",
                },
              });
            } else {
              await tx.invoice.update({
                where: { id: booking.invoices[0].id },
                data: {
                  status: "PAID",
                  paidAmount: booking.totalAmount,
                  balanceDue: 0,
                },
              });
            }
          });

          await logAuditAction({
            userId: booking.customerId,
            userName: booking.guestName,
            action: "AUTO_RECONCILED_EXPIRED_HOLD_PAID",
            entity: "Booking",
            entityId: booking.id,
            newValue: {
              merchantOrderId: latestPayment.gatewayOrderId,
              recoveredAmount: booking.totalAmount,
            },
          });

          reconciledCount++;
          continue;
        }
      } catch (err) {
        console.warn(`Could not verify PhonePe status for expired hold ${booking.bookingReference}:`, err);
      }
    }

    // 2. If payment did not complete, safely cancel and release the bed back to inventory
    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          bookingStatus: "CANCELLED",
          paymentStatus: "FAILED",
          holdExpiresAt: null,
        },
      });

      if (latestPayment && latestPayment.status === "PENDING") {
        await tx.payment.update({
          where: { id: latestPayment.id },
          data: { status: "FAILED" },
        });
      }

      if (booking.bedId) {
        await tx.bed.update({
          where: { id: booking.bedId },
          data: {
            status: "AVAILABLE",
            currentOccupantId: null,
          },
        });
      }
    });

    releasedCount++;
  }

  return { reconciledCount, releasedCount };
}