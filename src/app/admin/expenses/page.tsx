import React from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import {
  canAccessModule,
  canUserDelete,
  canUserEdit,
  getFirstAllowedAdminRoute,
  isFinancialsHidden,
} from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { ExpensesClient, SerializedExpense } from "./ExpensesClient";

export const dynamic = "force-dynamic";

export default async function AdminExpensesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");

  if (!canAccessModule(user, "expenses")) {
    redirect(getFirstAllowedAdminRoute(user));
  }

  const [hostels, expenses] = await Promise.all([
    prisma.hostel.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.expense.findMany({
      include: {
        hostel: { select: { id: true, name: true } },
      },
      orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const serializedExpenses: SerializedExpense[] = expenses.map((e) => ({
    id: e.id,
    hostelId: e.hostelId,
    hostelName: e.hostel?.name || null,
    title: e.title,
    category: e.category,
    amount: e.amount,
    expenseDate: e.expenseDate.toISOString(),
    paymentMode: e.paymentMode,
    status: e.status,
    vendorName: e.vendorName,
    vendorPhone: e.vendorPhone,
    receiptImage: e.receiptImage,
    isRecurring: e.isRecurring,
    notes: e.notes,
    recordedByName: e.recordedByName,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">
          Property Operations &amp; Cashflow
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          Expenses &amp; Bills Tracker
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Track power bills, water tankers, staff salaries, electric &amp; plumbing works, daily essentials, and unpaid bills.
        </p>
      </div>

      <ExpensesClient
        hostels={hostels}
        initialExpenses={serializedExpenses}
        canEdit={canUserEdit(user)}
        canDelete={canUserDelete(user)}
        hideFinancials={isFinancialsHidden(user)}
      />
    </div>
  );
}
