import React from "react";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { canAccessModule, canUserEdit, getFirstAllowedAdminRoute } from "@/lib/permissions";
import { getRoomTypePriceRates } from "@/lib/pricing";
import PaymentsClient from "./PaymentsClient";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || !canAccessModule(user, "payments")) {
    redirect(getFirstAllowedAdminRoute(user));
  }

  const canEdit = canUserEdit(user);
  const resolvedParams = searchParams ? await searchParams : {};
  const initialSearch = resolvedParams.search || "";

  const [payments, refunds, invoices, monthlyBookings] = await Promise.all([
    prisma.payment.findMany({
      select: {
        id: true,
        amount: true,
        gateway: true,
        gatewayPaymentId: true,
        paymentMethod: true,
        status: true,
        createdAt: true,
        booking: {
          select: {
            id: true,
            bookingReference: true,
            guestName: true,
            guestPhone: true,
            customerId: true,
            hostel: { select: { id: true, name: true } },
          },
        },
        customer: { select: { id: true, name: true, phone: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 250,
    }),
    prisma.refund.findMany({
      select: {
        id: true,
        amount: true,
        reason: true,
        status: true,
        processedBy: true,
        requestedAt: true,
        processedAt: true,
        booking: {
          select: {
            id: true,
            bookingReference: true,
            guestName: true,
            hostel: { select: { id: true, name: true } },
            customer: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { requestedAt: "desc" },
      take: 250,
    }),
    prisma.invoice.findMany({
      select: {
        id: true,
        invoiceNumber: true,
        bookingId: true,
        hostelId: true,
        issueDate: true,
        dueDate: true,
        baseAmount: true,
        taxAmount: true,
        totalAmount: true,
        paidAmount: true,
        balanceDue: true,
        status: true,
        createdAt: true,
        hostel: { select: { id: true, name: true } },
        booking: {
          select: {
            id: true,
            bookingReference: true,
            customerId: true,
            guestName: true,
            guestEmail: true,
            guestPhone: true,
            stayType: true,
            bookingStatus: true,
            checkOutDate: true,
            securityDeposit: true,
            paidSecurityDeposit: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 400,
    }),
    prisma.booking.findMany({
      where: {
        stayType: "MONTHLY",
        bookingStatus: { in: ["CONFIRMED", "CHECKED_IN"] },
      },
      select: {
        id: true,
        customerId: true,
        bookingReference: true,
        guestName: true,
        guestPhone: true,
        checkOutDate: true,
        baseAmount: true,
        balanceAmount: true,
        securityDeposit: true,
        paidSecurityDeposit: true,
        monthlyRentDiscountAmount: true,
        monthlyRentDiscountMonths: true,
        monthlyRentDiscountCyclesApplied: true,
        hostel: { select: { id: true, name: true } },
        room: {
          select: {
            roomNumber: true,
            isAC: true,
            roomType: {
              select: {
                id: true,
                name: true,
                basePrice: true,
                monthlyPrice: true,
                pricePerDayNonAC: true,
                price7DaysNonAC: true,
                price10DaysNonAC: true,
                price15DaysNonAC: true,
                price30DaysNonAC: true,
                pricePerDayAC: true,
                price7DaysAC: true,
                price10DaysAC: true,
                price15DaysAC: true,
                price30DaysAC: true,
              },
            },
          },
        },
        bed: { select: { bedNumber: true } },
        invoices: {
          where: { status: { not: "CANCELLED" } },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            dueDate: true,
            totalAmount: true,
            paidAmount: true,
            status: true,
            baseAmount: true,
            monthlyRentDiscountAmount: true,
          },
        },
      },
      orderBy: { checkOutDate: "asc" },
      take: 500,
    }),
  ]);

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

    const pendingDeposit = Math.max(0, (booking.securityDeposit || 0) - (booking.paidSecurityDeposit || 0));
    const pastBalance = Math.max(0, booking.balanceAmount || 0);
    const pastOtherBalance = Math.max(0, pastBalance - pendingDeposit);
    const cycleRent = amountDue;
    const totalDueWithPast = pastBalance + cycleRent;

    return {
      bookingId: booking.id,
      customerId: booking.customerId,
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
      securityDeposit: booking.securityDeposit || 0,
      paidSecurityDeposit: booking.paidSecurityDeposit || 0,
      pendingDeposit,
      pastBalance,
      pastOtherBalance,
      cycleRent,
      totalDueWithPast,
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
        initialSearch={initialSearch}
        canEdit={canEdit}
      />
    </div>
  );
}
