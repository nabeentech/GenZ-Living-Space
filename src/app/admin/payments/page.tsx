import React from "react";
import prisma from "@/lib/prisma";
import PaymentsClient from "./PaymentsClient";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
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

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">
          Financials & Ledger
        </span>
        <h1 className="text-3xl font-black text-white">Payments & Invoices</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Review payment gateway transaction signatures, approve customer refunds, and audit tax invoices.
        </p>
      </div>

      <PaymentsClient
        initialPayments={payments}
        initialRefunds={refunds}
        invoices={invoices}
      />
    </div>
  );
}
