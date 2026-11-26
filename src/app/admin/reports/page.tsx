import React from "react";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { canAccessModule, getFirstAllowedAdminRoute } from "@/lib/permissions";
import ReportsClient from "./ReportsClient";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const user = await getSessionUser();
  if (!user || !canAccessModule(user, "reports")) {
    redirect(getFirstAllowedAdminRoute(user));
  }

  const [hostels, payments, invoices, activeBookings, refunds, expenses] = await Promise.all([
    prisma.hostel.findMany({
      select: {
        id: true,
        name: true,
        city: true,
        rooms: {
          select: {
            id: true,
            beds: {
              where: { active: true },
              select: { id: true, status: true },
            },
          },
        },
      },
    }),
    prisma.payment.findMany({
      where: { status: "CAPTURED" },
      select: {
        id: true,
        amount: true,
        gateway: true,
        paymentMethod: true,
        metadata: true,
        createdAt: true,
        bookingId: true,
        booking: {
          select: {
            id: true,
            bookingReference: true,
            guestName: true,
            guestPhone: true,
            stayType: true,
            hostelId: true,
            securityDeposit: true,
            paidSecurityDeposit: true,
            room: { select: { roomNumber: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.findMany({
      where: {
        status: { not: "CANCELLED" },
        booking: { bookingStatus: { notIn: ["CANCELLED", "REFUNDED"] } },
      },
      select: {
        id: true,
        invoiceNumber: true,
        issueDate: true,
        dueDate: true,
        totalAmount: true,
        paidAmount: true,
        balanceDue: true,
        status: true,
        securityDeposit: true,
        paidSecurityDeposit: true,
        serviceFee: true,
        baseAmount: true,
        hostelId: true,
        bookingId: true,
        booking: {
          select: {
            id: true,
            bookingReference: true,
            guestName: true,
            guestPhone: true,
            stayType: true,
            bookingStatus: true,
            checkOutDate: true,
            room: { select: { roomNumber: true } },
          },
        },
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.booking.findMany({
      where: {
        bookingStatus: { in: ["CONFIRMED", "CHECKED_IN"] },
      },
      select: {
        id: true,
        hostelId: true,
        stayType: true,
        securityDeposit: true,
        paidSecurityDeposit: true,
        serviceFee: true,
        paidMaintenanceFee: true,
        balanceAmount: true,
      },
    }),
    prisma.refund.findMany({
      select: {
        id: true,
        amount: true,
        status: true,
        requestedAt: true,
        processedAt: true,
        reason: true,
        booking: {
          select: {
            hostelId: true,
            stayType: true,
            bookingReference: true,
            guestName: true,
          },
        },
      },
      orderBy: { requestedAt: "desc" },
    }),
    prisma.expense.findMany({
      select: {
        id: true,
        hostelId: true,
        title: true,
        category: true,
        amount: true,
        expenseDate: true,
        paymentMode: true,
        status: true,
      },
      orderBy: { expenseDate: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">
          Money &amp; Collection Summary
        </span>
        <h1 className="text-3xl font-black text-white">Money &amp; Revenue Report</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Simple view of how much you billed, how much money you received, money spent on bills, and your net profit.
        </p>
      </div>

      <ReportsClient
        hostels={hostels}
        payments={payments}
        invoices={invoices}
        activeBookings={activeBookings}
        refunds={refunds}
        expenses={expenses}
      />
    </div>
  );
}
