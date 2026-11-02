import React from "react";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { canAccessModule } from "@/lib/permissions";
import { getRoomTypePriceRates } from "@/lib/pricing";
import PaymentsClient from "./PaymentsClient";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const user = await getSessionUser();
  if (!user || !canAccessModule(user, "payments")) redirect("/admin");

  const payments = await prisma.payment.findMany({
    include: {
      booking: {
        include: { hostel: true },
      },
      customer: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const refunds = await prisma.refund.findMany({
    include: {
      booking: {
        include: { hostel: true, customer: true },
      },
    },
    orderBy: { requestedAt: "desc" },
  });

  const invoices = await prisma.invoice.findMany({
    include: {
      hostel: true,
      booking: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const monthlyBookings = await prisma.booking.findMany({
    where: {
      stayType: "MONTHLY",
      bookingStatus: { in: ["CONFIRMED", "CHECKED_IN"] },
    },
    include: {
      hostel: { select: { id: true, name: true } },
      room: { include: { roomType: true } },
      bed: { select: { bedNumber: true } },
      invoices: { where: { status: { not: "CANCELLED" } }, orderBy: { createdAt: "desc" }, select: { id: true, dueDate: true, totalAmount: true, paidAmount: true, status: true, baseAmount: true, monthlyRentDiscountAmount: true } },
    },
    orderBy: { checkOutDate: "asc" },
  });

  const rentDues = monthlyBookings.map((booking) => {
    const rates = getRoomTypePriceRates(booking.room.roomType, booking.room.isAC);
    const monthlyRent = Math.max(0, Math.round(rates.days30 || booking.baseAmount));
    const discountCyclesRemaining = Math.max(0, booking.monthlyRentDiscountMonths - booking.monthlyRentDiscountCyclesApplied);
    const monthlyDiscount = discountCyclesRemaining > 0
      ? Math.min(monthlyRent, Math.max(0, booking.monthlyRentDiscountAmount))
      : 0;
    const dueDate = booking.checkOutDate;
    const matchingInvoice = booking.invoices.find((invoice) =>
      new Date(invoice.dueDate).toISOString().slice(0, 10) === dueDate.toISOString().slice(0, 10) &&
      invoice.status !== "CANCELLED"
    );
    const amountDue = matchingInvoice
      ? Math.max(0, matchingInvoice.totalAmount - matchingInvoice.paidAmount)
      : monthlyRent - monthlyDiscount;

    return {
      bookingId: booking.id,
      bookingReference: booking.bookingReference,
      guestName: booking.guestName,
      guestPhone: booking.guestPhone,
      hostelName: booking.hostel.name,
      roomName: booking.room.roomNumber,
      roomType: booking.room.roomType.name,
      bedLabel: booking.bed.bedNumber,
      dueDate,
      baseRent: matchingInvoice?.baseAmount ?? monthlyRent,
      discount: matchingInvoice?.monthlyRentDiscountAmount ?? monthlyDiscount,
      amountDue,
      invoiceId: matchingInvoice?.id ?? null,
      invoiceStatus: matchingInvoice?.status ?? null,
      invoicePaid: matchingInvoice ? matchingInvoice.totalAmount <= matchingInvoice.paidAmount : false,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">
          Financials & Ledger
        </span>
        <h1 className="text-3xl font-black text-white">Payments & Invoices</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Track outstanding balances, record reception payments, review transactions, refunds, and invoices.
        </p>
      </div>

      <PaymentsClient
        initialPayments={payments}
        initialRefunds={refunds}
        invoices={invoices}
        rentDues={rentDues}
      />
    </div>
  );
}
