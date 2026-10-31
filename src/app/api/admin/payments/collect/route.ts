import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";
import { paymentTransaction } from "@/lib/payment-reconciliation";

const allowedMethods = new Set(["cash", "upi", "card", "bank_transfer", "offline_prepaid"]);

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, [ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER, ROLES.RECEPTIONIST, ROLES.FINANCE])) {
      return NextResponse.json({ success: false, message: "Unauthorized staff role." }, { status: 403 });
    }

    const { bookingId, invoiceId, amount: rawAmount, paymentMethod } = await req.json();
    const amount = Number(rawAmount);
    const amountPaise = Math.round(amount * 100);
    if (!bookingId || !invoiceId) {
      return NextResponse.json({ success: false, message: "Booking and invoice are required." }, { status: 400 });
    }
    if (!Number.isFinite(amount) || !Number.isSafeInteger(amountPaise) || amountPaise < 1 || Math.abs(amount * 100 - amountPaise) > 0.0001) {
      return NextResponse.json({ success: false, message: "Enter a valid payment amount." }, { status: 400 });
    }
    if (!allowedMethods.has(paymentMethod)) {
      return NextResponse.json({ success: false, message: "Choose a valid payment method." }, { status: 400 });
    }

    const result = await paymentTransaction(prisma, async (tx) => {
      // Acquire a write lock before reading balances so simultaneous desk
      // collections cannot both spend the same outstanding amount.
      const lock = await tx.booking.updateMany({ where: { id: bookingId }, data: { updatedAt: new Date() } });
      if (lock.count !== 1) throw Object.assign(new Error("Booking not found."), { status: 404 });
      const booking = await tx.booking.findUnique({ where: { id: bookingId } });
      const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, bookingId } });
      if (!booking || !invoice) throw Object.assign(new Error("Booking or invoice not found."), { status: 404 });
      if (["CANCELLED", "REFUNDED"].includes(booking.bookingStatus) || invoice.status === "CANCELLED") {
        throw Object.assign(new Error("This cancelled reservation cannot receive a balance payment."), { status: 409 });
      }

      const invoiceDuePaise = Math.max(0, Math.round((invoice.totalAmount - invoice.paidAmount) * 100));
      if (invoiceDuePaise <= 0) throw Object.assign(new Error("This invoice is already paid."), { status: 409 });
      const bookingDuePaise = Math.max(0, Math.round(booking.balanceAmount * 100));
      const expectedBookingDuePaise = Math.max(0, Math.round((booking.totalAmount - booking.paidAmount) * 100));
      if (bookingDuePaise !== expectedBookingDuePaise) {
        throw Object.assign(new Error("Reservation paid and due totals do not balance. Ask Finance to reconcile before collecting."), { status: 409 });
      }
      const outstandingInvoices = await tx.invoice.findMany({ where: { bookingId, status: { not: "CANCELLED" } } });
      const ledgerDuePaise = outstandingInvoices.reduce((total, row) => total + Math.max(0, Math.round((row.totalAmount - row.paidAmount) * 100)), 0);
      if (ledgerDuePaise !== bookingDuePaise) {
        throw Object.assign(new Error("Invoice balances do not match the reservation balance. Ask Finance to reconcile before collecting payment."), { status: 409 });
      }
      if (bookingDuePaise <= 0 || invoiceDuePaise > bookingDuePaise) {
        throw Object.assign(new Error("The invoice balance does not match the reservation balance. Ask Finance to reconcile it before collecting payment."), { status: 409 });
      }
      if (amountPaise > invoiceDuePaise) {
        throw Object.assign(new Error(`Payment cannot exceed the invoice balance of ₹${(invoiceDuePaise / 100).toLocaleString("en-IN")}.`), { status: 400 });
      }

      const invoicePaidPaise = Math.round(invoice.paidAmount * 100) + amountPaise;
      const invoiceBalancePaise = Math.max(0, Math.round(invoice.totalAmount * 100) - invoicePaidPaise);
      const claimedInvoice = await tx.invoice.updateMany({
        where: { id: invoice.id, paidAmount: invoice.paidAmount, status: { not: "CANCELLED" } },
        data: {
          paidAmount: invoicePaidPaise / 100,
          balanceDue: invoiceBalancePaise / 100,
          status: invoiceBalancePaise === 0 ? "PAID" : "PARTIAL",
        },
      });
      if (claimedInvoice.count !== 1) throw Object.assign(new Error("This invoice changed while payment was being recorded. Refresh and retry."), { status: 409 });
      const invoiceUpdated = await tx.invoice.findUniqueOrThrow({ where: { id: invoice.id } });

      const appliedToBookingPaise = Math.min(amountPaise, bookingDuePaise);
      const bookingUpdated = appliedToBookingPaise > 0
        ? await tx.booking.update({
            where: { id: booking.id },
            data: {
              paidAmount: (Math.round(booking.paidAmount * 100) + appliedToBookingPaise) / 100,
              balanceAmount: (bookingDuePaise - appliedToBookingPaise) / 100,
              paymentStatus: bookingDuePaise === appliedToBookingPaise ? "PAID" : "PARTIAL",
            },
          })
        : booking;
      if (bookingUpdated.balanceAmount === 0) {
        await tx.additionalCharge.updateMany({
          where: { bookingId: booking.id, status: "PENDING" },
          data: { status: "PAID" },
        });
      }

      const payment = await tx.payment.create({
        data: {
          bookingId: booking.id,
          customerId: booking.customerId,
          amount: amountPaise / 100,
          currency: "INR",
          gateway: paymentMethod.toUpperCase(),
          gatewayPaymentId: `reception_balance_${Date.now()}`,
          status: "CAPTURED",
          paymentMethod,
          metadata: JSON.stringify({ invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, collectedBy: user.name }),
        },
      });

      return { invoice: invoiceUpdated, booking: bookingUpdated, payment };
    });

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: "OUTSTANDING_PAYMENT_COLLECTED",
      entity: "Booking",
      entityId: bookingId,
      newValue: { invoiceId, amount: result.payment.amount, paymentMethod, paymentId: result.payment.id },
    });

    return NextResponse.json({ success: true, message: `₹${result.payment.amount.toLocaleString("en-IN")} payment recorded.`, data: result });
  } catch (error: any) {
    console.error("Outstanding payment collection error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to record payment." },
      { status: error.status || 500 }
    );
  }
}
