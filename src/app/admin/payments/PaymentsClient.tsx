"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import DatePicker from "@/components/ui/DatePicker";
import { CreditCard, CheckCircle2, XCircle, Printer, Download, AlertCircle, CalendarClock, IndianRupee } from "lucide-react";

const CustomerProfileModal = dynamic(() => import("@/components/admin/CustomerProfileModal"), {
  ssr: false,
});

interface PaymentsClientProps {
  initialPayments: any[];
  initialRefunds: any[];
  invoices: any[];
  rentDues: any[];
  canEdit?: boolean;
}

export const PaymentsClient: React.FC<PaymentsClientProps> = ({
  initialPayments,
  initialRefunds,
  invoices,
  rentDues: initialRentDues,
  canEdit = true,
}) => {
  const [activeTab, setActiveTab] = useState<"rent" | "due" | "payments" | "refunds" | "invoices">("rent");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [rentDues, setRentDues] = useState(initialRentDues);
  const [payments, setPayments] = useState(initialPayments);
  const [refunds, setRefunds] = useState(initialRefunds);
  const [invoiceRows, setInvoiceRows] = useState(invoices);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [collectingInvoice, setCollectingInvoice] = useState<any | null>(null);
  const [collectionAmount, setCollectionAmount] = useState("");
  const [collectionMethod, setCollectionMethod] = useState("cash");
  const [newBalanceDueDate, setNewBalanceDueDate] = useState("");
  const [collectionError, setCollectionError] = useState("");
  const [collectionSuccess, setCollectionSuccess] = useState("");
  const [rentCollection, setRentCollection] = useState<any | null>(null);
  const [rentAmount, setRentAmount] = useState("");
  const [rentDueDate, setRentDueDate] = useState("");
  const [rentMethod, setRentMethod] = useState("CASH");
  const [isSmartAllocation, setIsSmartAllocation] = useState(true);
  const [customDepositAlloc, setCustomDepositAlloc] = useState("");
  const [customPastAlloc, setCustomPastAlloc] = useState("");
  const [customRentAlloc, setCustomRentAlloc] = useState("");
  const [confirmZeroRentExtension, setConfirmZeroRentExtension] = useState(false);
  const [rentError, setRentError] = useState("");
  const [rentProcessing, setRentProcessing] = useState(false);
  const [profileCustomerId, setProfileCustomerId] = useState<string | null>(null);

  const dueInvoices = invoiceRows.filter((invoice) =>
    invoice.status !== "CANCELLED" &&
    !["CANCELLED", "REFUNDED"].includes(invoice.booking?.bookingStatus) &&
    !(invoice.status === "DUE" && invoice.booking?.stayType === "MONTHLY" && new Date(invoice.dueDate).toISOString().slice(0, 10) === new Date(invoice.booking.checkOutDate).toISOString().slice(0, 10)) &&
    Math.round((invoice.totalAmount - invoice.paidAmount) * 100) > 0
  );
  const outstandingTotal = dueInvoices.reduce((sum, invoice) => sum + Math.max(0, invoice.totalAmount - invoice.paidAmount), 0);

  const indiaDateKey = (date: Date) => new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
  const todayKey = indiaDateKey(new Date());
  const getRentStatus = (dueDate: string | Date) => {
    const dueKey = indiaDateKey(new Date(dueDate));
    if (dueKey < todayKey) return "overdue";
    if (dueKey === todayKey) return "due";
    const today = new Date(`${todayKey}T00:00:00+05:30`).getTime();
    const due = new Date(`${dueKey}T00:00:00+05:30`).getTime();
    return (due - today) / 86400000 <= 7 ? "due-soon" : "upcoming";
  };
  const rentStatusCounts = rentDues.reduce((counts: Record<string, number>, row) => {
    const status = getRentStatus(row.dueDate);
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
  const upcomingRentTotal = rentDues.reduce((sum, row) => sum + (row.invoicePaid ? 0 : row.amountDue), 0);

  const rentDuesPage = React.useMemo(() => rentDues.slice((page - 1) * pageSize, page * pageSize), [rentDues, page]);
  const dueInvoicesPage = React.useMemo(() => dueInvoices.slice((page - 1) * pageSize, page * pageSize), [dueInvoices, page]);
  const paymentsPage = React.useMemo(() => payments.slice((page - 1) * pageSize, page * pageSize), [payments, page]);
  const refundsPage = React.useMemo(() => refunds.slice((page - 1) * pageSize, page * pageSize), [refunds, page]);
  const invoicesPage = React.useMemo(() => invoiceRows.slice((page - 1) * pageSize, page * pageSize), [invoiceRows, page]);

  const activeTotal = activeTab === "rent" ? rentDues.length
    : activeTab === "due" ? dueInvoices.length
    : activeTab === "payments" ? payments.length
    : activeTab === "refunds" ? refunds.length
    : invoiceRows.length;

  const totalPages = Math.max(1, Math.ceil(activeTotal / pageSize));

  const openRentModal = (row: any) => {
    if (!canEdit) return;
    setRentCollection(row);
    setRentAmount(String(row.totalDueWithPast || row.amountDue));
    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 7);
    setRentDueDate(defaultDue.toISOString().slice(0, 10));
    setRentMethod("CASH");
    setIsSmartAllocation(true);
    setCustomDepositAlloc("");
    setCustomPastAlloc("");
    setCustomRentAlloc("");
    setConfirmZeroRentExtension(false);
    setRentError("");
  };

  const handleMonthlyRent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canEdit || !rentCollection) return;
    const paid = Number(rentAmount);
    if (!Number.isFinite(paid) || paid <= 0) {
      setRentError("Enter a valid payment amount greater than 0.");
      return;
    }
    const totalOwed = rentCollection.totalDueWithPast || rentCollection.amountDue || 0;
    if (paid > totalOwed) {
      setRentError(`Payment cannot exceed the total outstanding of ₹${totalOwed.toLocaleString("en-IN")}.`);
      return;
    }

    const pendingDep = rentCollection.pendingDeposit || 0;
    const pastBal = rentCollection.pastBalance || 0;
    const cycleR = rentCollection.cycleRent || rentCollection.amountDue || 0;

    let allocDep = Math.min(paid, pendingDep);
    let allocPast = Math.min(Math.max(0, paid - allocDep), pastBal);
    let allocCycleRent = Math.min(Math.max(0, paid - allocDep - allocPast), cycleR);

    if (!isSmartAllocation) {
      const manualDep = pendingDep > 0 && customDepositAlloc !== "" ? Number(customDepositAlloc) : 0;
      const manualPast = pastBal > 0 && customPastAlloc !== "" ? Number(customPastAlloc) : 0;
      const manualRent = customRentAlloc !== "" ? Number(customRentAlloc) : 0;

      if (manualDep + manualPast + manualRent > paid) {
        setRentError(`Sum of custom allocations (₹${(manualDep + manualPast + manualRent).toLocaleString("en-IN")}) exceeds amount received (₹${paid.toLocaleString("en-IN")}).`);
        return;
      }

      allocDep = Math.min(manualDep, pendingDep, paid);
      const remAfterDep = Math.max(0, paid - allocDep);
      allocPast = Math.min(manualPast, pastBal, remAfterDep);
      const remAfterPast = Math.max(0, remAfterDep - allocPast);
      allocCycleRent = Math.min(manualRent, cycleR, remAfterPast);
    }

    if (allocCycleRent === 0 && !confirmZeroRentExtension) {
      setRentError("₹0 is credited towards the new rent cycle. Please check the owner approval checkbox below to authorize extending the stay.");
      return;
    }

    const rem = Math.max(0, totalOwed - paid);
    if (rem > 0 && !rentDueDate) {
      setRentError("Please choose a balance due date for the remaining amount.");
      return;
    }

    setRentProcessing(true);
    setRentError("");
    try {
      const response = await fetch(`/api/bookings/${rentCollection.bookingId}/monthly-rent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "OFFLINE",
          amount: paid,
          paymentMode: rentMethod,
          balanceDueDate: rem > 0 ? rentDueDate : undefined,
          customDepositAlloc: !isSmartAllocation && customDepositAlloc !== "" ? Number(customDepositAlloc) : undefined,
          customPastAlloc: !isSmartAllocation && customPastAlloc !== "" ? Number(customPastAlloc) : undefined,
          customRentAlloc: !isSmartAllocation && customRentAlloc !== "" ? Number(customRentAlloc) : undefined,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "Could not record rent payment.");
      const updatedBooking = json.data.updatedBooking;
      const newInvoice = json.data.invoice;
      const newPayment = json.data.paymentRecord;

      const nextDiscount = updatedBooking.monthlyRentDiscountCyclesApplied < updatedBooking.monthlyRentDiscountMonths
        ? Math.min(rentCollection.baseRent, updatedBooking.monthlyRentDiscountAmount)
        : 0;
      setRentDues((rows) => rows.map((row) => row.bookingId === rentCollection.bookingId ? {
        ...row,
        dueDate: updatedBooking.checkOutDate,
        discount: nextDiscount,
        amountDue: rentCollection.baseRent - nextDiscount,
        invoiceId: null,
        invoiceStatus: null,
        invoicePaid: false,
      } : row));

      if (newInvoice) {
        setInvoiceRows((current) => {
          const exists = current.some((inv) => inv.id === newInvoice.id);
          if (exists) {
            return current.map((inv) => inv.id === newInvoice.id ? { ...inv, ...newInvoice, booking: { ...inv.booking, ...updatedBooking } } : inv);
          } else {
            return [{
              ...newInvoice,
              booking: {
                id: updatedBooking.id,
                bookingReference: updatedBooking.bookingReference,
                guestName: rentCollection.guestName,
                guestPhone: rentCollection.guestPhone,
                checkInDate: updatedBooking.checkInDate,
                checkOutDate: updatedBooking.checkOutDate,
                stayType: updatedBooking.stayType,
                totalAmount: updatedBooking.totalAmount,
                paidAmount: updatedBooking.paidAmount,
                balanceAmount: updatedBooking.balanceAmount,
                hostel: { name: rentCollection.hostelName },
                room: { roomNumber: rentCollection.roomName, roomType: { name: rentCollection.roomType } },
                bed: { bedNumber: rentCollection.bedLabel },
              },
              hostel: { name: rentCollection.hostelName },
            }, ...current];
          }
        });
      }

      if (newPayment) {
        setPayments((current) => [{
          ...newPayment,
          booking: { bookingReference: rentCollection.bookingReference, hostel: { name: rentCollection.hostelName } },
          customer: { name: rentCollection.guestName, email: rentCollection.guestEmail || "" },
        }, ...current]);
      }

      setRentCollection(null);
      setCollectionSuccess(json.message);
      if (rem > 0) {
        setActiveTab("due");
      }
    } catch (error: any) {
      setRentError(error.message || "Could not record rent payment.");
    } finally {
      setRentProcessing(false);
    }
  };

  const openCollection = (invoice: any) => {
    if (!canEdit) return;
    setCollectingInvoice(invoice);
    setCollectionAmount((invoice.totalAmount - invoice.paidAmount).toFixed(2).replace(/\.00$/, ""));
    setCollectionMethod("cash");
    const currentDue = invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    setNewBalanceDueDate(currentDue);
    setCollectionError("");
    setCollectionSuccess("");
  };

  const handleCollectBalance = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canEdit || !collectingInvoice) return;
    const remainingBefore = Math.max(0, collectingInvoice.totalAmount - collectingInvoice.paidAmount);
    const amountToPay = Number(collectionAmount);
    if (!Number.isFinite(amountToPay) || amountToPay <= 0) {
      setCollectionError("Enter a valid payment amount greater than 0.");
      return;
    }
    if (amountToPay > remainingBefore) {
      setCollectionError(`Payment cannot exceed the invoice balance of ₹${remainingBefore.toLocaleString("en-IN")}.`);
      return;
    }
    const remainingAfter = Math.max(0, remainingBefore - amountToPay);
    if (remainingAfter > 0 && !newBalanceDueDate) {
      setCollectionError("Please select an agreed balance due date.");
      return;
    }

    setProcessingId(collectingInvoice.id);
    setCollectionError("");
    try {
      const response = await fetch("/api/admin/payments/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: collectingInvoice.bookingId,
          invoiceId: collectingInvoice.id,
          amount: amountToPay,
          paymentMethod: collectionMethod,
          newDueDate: remainingAfter > 0 ? newBalanceDueDate : undefined,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "Could not record payment.");

      setInvoiceRows((current) => current.map((invoice) => invoice.id === json.data.invoice.id ? {
        ...invoice,
        ...json.data.invoice,
        booking: { ...invoice.booking, ...json.data.booking },
      } : invoice));
      setPayments((current) => [{
        ...json.data.payment,
        booking: { bookingReference: collectingInvoice.booking?.bookingReference, hostel: collectingInvoice.hostel },
        customer: { name: collectingInvoice.booking?.guestName, email: collectingInvoice.booking?.guestEmail },
      }, ...current]);
      setCollectionSuccess(json.message);
      setCollectingInvoice(null);
    } catch (error: any) {
      setCollectionError(error.message || "Could not record payment.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRefundAction = async (refundId: string, action: "APPROVE" | "REJECT" | "MARK_PROCESSED") => {
    if (!canEdit) return;
    if (action === "MARK_PROCESSED" && !window.confirm("Confirm the refund has actually been sent to the guest outside the system?")) return;
    setProcessingId(refundId);
    try {
      const res = await fetch(`/api/admin/refunds/${refundId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to process refund");
      }

      setRefunds((prev) =>
        prev.map((r) =>
          r.id === refundId
            ? { ...r, ...json.data }
            : r
        )
      );
    } catch (err: any) {
      alert(err.message || "Error processing refund");
    } finally {
      setProcessingId(null);
    }
  };

  const renderPagination = (currentCount: number) => {
    if (currentCount <= pageSize) return null;
    return (
      <div className="pt-4 mt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div>
          Showing <span className="font-bold text-white">{(page - 1) * pageSize + 1}</span> to{" "}
          <span className="font-bold text-white">
            {Math.min(page * pageSize, currentCount)}
          </span>{" "}
          of <span className="font-bold text-white">{currentCount}</span> records
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200">
            Page {page} of {Math.max(1, Math.ceil(currentCount / pageSize))}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(Math.ceil(currentCount / pageSize), p + 1))}
            disabled={page >= Math.ceil(currentCount / pageSize)}
          >
            Next
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => { setActiveTab("rent"); setPage(1); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === "rent" ? "bg-indigo-600 text-white shadow-glow" : "text-slate-400 hover:text-white"}`}
        >
          Rent dues ({rentDues.length})
        </button>
        <button
          onClick={() => { setActiveTab("due"); setPage(1); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === "due" ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20" : "text-slate-400 hover:text-white"}`}
        >
          Outstanding ({dueInvoices.length}) · ₹{outstandingTotal.toLocaleString("en-IN")}
        </button>
        <button
          onClick={() => { setActiveTab("payments"); setPage(1); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "payments"
              ? "bg-indigo-600 text-white shadow-glow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Captured Transactions ({payments.length})
        </button>
        <button
          onClick={() => { setActiveTab("refunds"); setPage(1); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "refunds"
              ? "bg-indigo-600 text-white shadow-glow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Refund Requests Queue ({refunds.length})
        </button>
        <button
          onClick={() => { setActiveTab("invoices"); setPage(1); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "invoices"
              ? "bg-indigo-600 text-white shadow-glow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Official Tax Invoices ({invoiceRows.length})
        </button>
      </div>

      {collectionSuccess && <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/60 p-3 text-sm text-emerald-200">{collectionSuccess}</div>}

      {activeTab === "rent" && (
        <section className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Monthly stays", value: rentDues.length, tone: "text-white" },
              { label: "Upcoming rent total", value: `₹${upcomingRentTotal.toLocaleString("en-IN")}`, tone: "text-indigo-200" },
              { label: "Due today / next 7 days", value: (rentStatusCounts.due || 0) + (rentStatusCounts["due-soon"] || 0), tone: "text-amber-200" },
              { label: "Overdue", value: rentStatusCounts.overdue || 0, tone: "text-rose-300" },
            ].map((item) => <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.label}</div>
              <div className={`mt-2 text-2xl font-black ${item.tone}`}>{item.value}</div>
            </div>)}
          </div>
          <div className="overflow-hidden rounded-3xl border border-slate-800 bg-[#111827]/80">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 p-5">
              <div>
                <h3 className="text-lg font-bold text-white">Monthly rent schedule</h3>
                <p className="mt-1 text-xs text-slate-400">Next rent due date for each active monthly resident. Rent shown includes any introductory monthly discount still applicable.</p>
              </div>
              <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-[11px] font-semibold text-indigo-200"><CalendarClock className="mr-1.5 inline h-3.5 w-3.5" /> Refreshed from active stays</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800 bg-slate-900/80 font-semibold uppercase tracking-wider text-slate-400"><tr>
                  <th className="p-3.5">Resident</th><th className="p-3.5">Property / room</th><th className="p-3.5">Next rent due</th><th className="p-3.5">Monthly rent</th><th className="p-3.5">Discount</th><th className="p-3.5">Amount due</th><th className="p-3.5 text-right">Action</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-800">
                  {rentDues.length === 0 ? <tr><td colSpan={7} className="p-12 text-center"><IndianRupee className="mx-auto mb-2 h-6 w-6 text-slate-600" /><div className="font-semibold text-slate-300">No active monthly stays</div><div className="mt-1 text-slate-500">New rent dates will appear here when a monthly resident is checked in.</div></td></tr> : rentDuesPage.map((row) => {
                    const status = getRentStatus(row.dueDate);
                    const statusText = row.invoicePaid ? "Invoice paid" : status === "overdue" ? "Overdue" : status === "due" ? "Due today" : status === "due-soon" ? "Due within 7 days" : "Upcoming";
                    const statusClass = row.invoicePaid ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : status === "overdue" ? "border-rose-500/30 bg-rose-500/10 text-rose-200" : status === "upcoming" ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-200" : "border-amber-500/30 bg-amber-500/10 text-amber-200";
                    return <tr key={row.bookingId} className="hover:bg-slate-900/50">
                      <td className="p-3.5">
                        <button
                          type="button"
                          onClick={() => row.customerId && setProfileCustomerId(row.customerId)}
                          className="block font-semibold text-white hover:text-indigo-300 underline decoration-slate-700 underline-offset-2 text-left"
                        >
                          {row.guestName}
                        </button>
                        <span className="mt-1 block font-mono text-[10px] text-slate-500">{row.bookingReference} · {row.guestPhone}</span>
                      </td>
                      <td className="p-3.5"><span className="block text-white">{row.hostelName}</span><span className="mt-1 block text-[10px] text-slate-500">{row.roomName} · {row.roomType} · {row.bedLabel}</span></td>
                      <td className="p-3.5"><span className="block text-slate-200">{new Date(row.dueDate).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" })}</span><span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}>{statusText}</span>{row.invoiceId && !row.invoicePaid && <span className="mt-1 block text-[10px] text-amber-300">Invoice issued · collection here will settle it</span>}{row.invoicePaid && <span className="mt-1 block text-[10px] text-emerald-300">Check whether the stay extension completed</span>}</td>
                      <td className="p-3.5">₹{row.baseRent.toLocaleString("en-IN")}</td>
                      <td className="p-3.5 text-emerald-300">{row.discount ? `−₹${row.discount.toLocaleString("en-IN")}` : "—"}</td>
                      <td className="p-3.5 font-black text-amber-200">₹{row.amountDue.toLocaleString("en-IN")}</td>
                      <td className="p-3.5 text-right">{row.invoicePaid ? <span className="text-xs text-emerald-300">Paid</span> : status === "upcoming" ? <span className="text-[11px] text-slate-500">Available within 7 days</span> : canEdit ? <Button size="sm" variant="outline" disabled={row.amountDue <= 0} onClick={() => openRentModal(row)}>Record & extend</Button> : <span className="text-xs text-slate-500 font-mono">View Only</span>}</td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
            {renderPagination(rentDues.length)}
          </div>
          <p className="text-[11px] text-slate-500">Rent due dates follow the current stay end date. Each collection creates a payment and invoice, then extends the stay by one 30-day cycle. If a stay is several cycles overdue, collect each displayed cycle in turn. Security deposit and one-time maintenance are excluded.</p>
        </section>
      )}

      {activeTab === "due" && (
        <div className="glass-panel space-y-4 overflow-hidden rounded-3xl border border-amber-500/20 bg-[#111827]/80 p-5 sm:p-7">
          <div>
            <h3 className="text-lg font-bold text-white">Outstanding balances</h3>
            <p className="mt-1 text-xs text-slate-400">Record cash, UPI, card, or bank payments here. Partial payments keep the remaining amount open.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-900/80 font-semibold uppercase tracking-wider text-slate-400"><tr>
                <th className="p-3">Booking / Invoice</th><th className="p-3">Guest</th><th className="p-3">Hostel</th><th className="p-3">Due date</th><th className="p-3">Total</th><th className="p-3">Paid</th><th className="p-3">Balance</th><th className="p-3 text-right">Action</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-800">
                {dueInvoices.length === 0 ? <tr><td colSpan={8} className="p-10 text-center text-slate-500">No outstanding balances.</td></tr> : dueInvoicesPage.map((invoice) => {
                  const balance = Math.max(0, invoice.totalAmount - invoice.paidAmount);
                  const overdue = new Date(invoice.dueDate).getTime() < new Date(new Date().toDateString()).getTime();
                  return <tr key={invoice.id} className="hover:bg-slate-900/50">
                    <td className="p-3"><span className="block font-mono font-bold text-indigo-300">{invoice.booking?.bookingReference || "—"}</span><span className="mt-1 block text-[10px] text-slate-500">{invoice.invoiceNumber}</span></td>
                    <td className="p-3 font-semibold text-white">
                      <button
                        type="button"
                        onClick={() => invoice.booking?.customerId && setProfileCustomerId(invoice.booking.customerId)}
                        className="hover:text-indigo-300 underline decoration-slate-700 underline-offset-2 text-left"
                      >
                        {invoice.booking?.guestName || invoice.booking?.guestEmail}
                      </button>
                    </td>
                    <td className="p-3">{invoice.hostel?.name}</td>
                    <td className="p-3"><span className={overdue ? "font-semibold text-rose-300" : "text-slate-300"}>{new Date(invoice.dueDate).toLocaleDateString()}</span>{overdue && <span className="ml-1 text-[10px] text-rose-400">Overdue</span>}</td>
                    <td className="p-3">₹{invoice.totalAmount.toLocaleString("en-IN")}</td>
                    <td className="p-3 text-emerald-300">₹{invoice.paidAmount.toLocaleString("en-IN")}</td>
                    <td className="p-3 font-black text-amber-300">₹{balance.toLocaleString("en-IN")}</td>
                    <td className="p-3 text-right">{canEdit ? <Button size="sm" variant="glow" disabled={processingId === invoice.id} onClick={() => openCollection(invoice)}>Record payment</Button> : <span className="text-xs text-slate-500 font-mono">View Only</span>}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
          {renderPagination(dueInvoices.length)}
        </div>
      )}

      {/* TAB 1: PAYMENTS */}
      {activeTab === "payments" && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-[#111827]/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Gateway Payment ID</th>
                  <th className="p-3.5">Booking Ref</th>
                  <th className="p-3.5">Resident</th>
                  <th className="p-3.5">Hostel</th>
                  <th className="p-3.5">Method</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {paymentsPage.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/50">
                    <td className="p-3.5 font-mono text-indigo-400 font-semibold">
                      {p.gatewayPaymentId || "CASH_COUNTER"}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-white">
                      {p.booking?.bookingReference}
                    </td>
                    <td className="p-3.5">
                      <span className="font-bold text-white block">{p.customer?.name}</span>
                      <span className="text-[11px] text-slate-400">{p.customer?.email}</span>
                    </td>
                    <td className="p-3.5">{p.booking?.hostel?.name}</td>
                    <td className="p-3.5 uppercase font-mono">{p.paymentMethod}</td>
                    <td className="p-3.5 font-black text-emerald-400">
                      ₹{p.amount.toLocaleString()}
                    </td>
                    <td className="p-3.5">
                      <Badge variant="available" size="sm">
                        {p.status}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-slate-400">
                      {new Date(p.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {renderPagination(payments.length)}
        </div>
      )}

      {/* TAB 2: REFUNDS */}
      {activeTab === "refunds" && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-[#111827]/80 overflow-hidden space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Booking Ref</th>
                  <th className="p-3.5">Resident</th>
                  <th className="p-3.5">Hostel</th>
                  <th className="p-3.5">Refund Reason</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {refunds.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No refund requests in queue.
                    </td>
                  </tr>
                ) : (
                  refundsPage.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-900/50">
                      <td className="p-3.5 font-mono font-bold text-white">
                        {r.booking?.bookingReference}
                      </td>
                      <td className="p-3.5 font-bold text-white">
                        {r.booking?.customer?.name}
                      </td>
                      <td className="p-3.5">{r.booking?.hostel?.name}</td>
                      <td className="p-3.5 text-slate-300">{r.reason}</td>
                      <td className="p-3.5 font-black text-rose-400">
                        ₹{r.amount.toLocaleString()}
                      </td>
                      <td className="p-3.5">
                        <Badge
                          variant={
                            r.status === "PROCESSED"
                              ? "available"
                              : r.status === "REJECTED"
                              ? "danger"
                              : "warning"
                          }
                          size="sm"
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-right">
                        {!canEdit ? (
                          <span className="text-xs text-slate-500 font-mono">View Only</span>
                        ) : r.status === "REQUESTED" ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              isLoading={processingId === r.id}
                              onClick={() => handleRefundAction(r.id, "APPROVE")}
                            >
                              Approve Refund
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRefundAction(r.id, "REJECT")}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : r.status === "APPROVED" ? (
                          <Button variant="outline" size="sm" isLoading={processingId === r.id} onClick={() => handleRefundAction(r.id, "MARK_PROCESSED")}>Mark refunded</Button>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {r.status === "PROCESSED" ? "Refund sent" : "Reviewed"} by {r.processedBy || "Finance"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {renderPagination(refunds.length)}
        </div>
      )}

      {/* TAB 3: INVOICES */}
      {activeTab === "invoices" && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-[#111827]/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Invoice #</th>
                  <th className="p-3.5">Booking Ref</th>
                  <th className="p-3.5">Hostel Property</th>
                  <th className="p-3.5">Issue Date</th>
                  <th className="p-3.5">Subtotal</th>
                  <th className="p-3.5">GST</th>
                  <th className="p-3.5">Total Amount</th>
                  <th className="p-3.5">Paid</th>
                  <th className="p-3.5">Balance / Due</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">View / Print</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {invoicesPage.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-900/50">
                    <td className="p-3.5 font-mono font-bold text-white">
                      {inv.invoiceNumber}
                    </td>
                    <td className="p-3.5 font-mono text-indigo-400">
                      {inv.booking?.bookingReference}
                    </td>
                    <td className="p-3.5 font-semibold text-white">
                      {inv.hostel.name}
                    </td>
                    <td className="p-3.5 text-slate-400">
                      {new Date(inv.issueDate).toLocaleDateString()}
                    </td>
                    <td className="p-3.5">₹{inv.baseAmount.toLocaleString()}</td>
                    <td className="p-3.5">₹{inv.taxAmount.toLocaleString()}</td>
                    <td className="p-3.5 font-black text-emerald-400">
                      ₹{inv.totalAmount.toLocaleString()}
                    </td>
                    <td className="p-3.5">₹{inv.paidAmount.toLocaleString("en-IN")}</td>
                    <td className="p-3.5 text-amber-300">₹{Math.max(0, inv.totalAmount - inv.paidAmount).toLocaleString("en-IN")}<span className="mt-1 block text-[10px] text-slate-500">Due {new Date(inv.dueDate).toLocaleDateString()}</span></td>
                    <td className="p-3.5"><Badge variant={inv.status === "PAID" ? "available" : "warning"} size="sm">{inv.status}</Badge></td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/confirmation?bookingRef=${inv.booking?.bookingReference}`}>
                          <Button variant="ghost" size="sm" leftIcon={<Printer className="w-3.5 h-3.5" />}>
                            View
                          </Button>
                        </Link>
                        <a href={`/api/invoices/${inv.bookingId}/pdf?invoiceId=${inv.id}`} download>
                          <Button variant="outline" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />}>
                            PDF
                          </Button>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {renderPagination(invoiceRows.length)}
        </div>
      )}

      {canEdit && collectingInvoice && (
        <Modal isOpen={!!collectingInvoice} onClose={() => processingId ? undefined : setCollectingInvoice(null)} title="Record balance payment" description={`Booking ${collectingInvoice.booking?.bookingReference} · ${collectingInvoice.booking?.guestName}`}>
          <form onSubmit={handleCollectBalance} className="space-y-4 py-2">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs">
              <div className="flex justify-between text-slate-300"><span>Invoice total</span><strong>₹{collectingInvoice.totalAmount.toLocaleString("en-IN")}</strong></div>
              <div className="mt-1 flex justify-between text-slate-300"><span>Already paid</span><strong>₹{collectingInvoice.paidAmount.toLocaleString("en-IN")}</strong></div>
              <div className="mt-2 flex justify-between border-t border-amber-500/20 pt-2 font-bold text-amber-200"><span>Current balance</span><strong>₹{(collectingInvoice.totalAmount - collectingInvoice.paidAmount).toLocaleString("en-IN")}</strong></div>
            </div>
            {collectionError && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/50 p-3 text-xs text-rose-200">{collectionError}</div>}
            
            <label className="block text-xs font-semibold text-slate-300">
              Amount received now (₹)
              <input
                required
                type="text"
                inputMode="decimal"
                value={collectionAmount}
                onChange={(e) => {
                  const [whole = "", fraction = ""] = e.target.value.replace(/[^\d.]/g, "").split(".");
                  setCollectionAmount(`${whole.slice(0, 9)}${e.target.value.includes(".") ? `.${fraction.slice(0, 2)}` : ""}`);
                }}
                className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-sm text-white"
              />
            </label>

            {(() => {
              const currentBal = Math.max(0, collectingInvoice.totalAmount - collectingInvoice.paidAmount);
              const paying = Number(collectionAmount) || 0;
              const remAfter = Math.max(0, currentBal - paying);

              if (paying > 0 && remAfter > 0) {
                return (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-amber-200">Remaining after this payment:</span>
                      <strong className="text-sm font-bold text-amber-300">₹{remAfter.toLocaleString("en-IN")}</strong>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-300">Agreed balance due date *</label>
                      <DatePicker
                        value={newBalanceDueDate}
                        onChange={setNewBalanceDueDate}
                        min={new Date().toISOString().slice(0, 10)}
                        triggerClassName="p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs w-full text-white"
                      />
                    </div>
                  </div>
                );
              }
              if (paying > 0 && remAfter === 0) {
                return (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs font-semibold text-emerald-300">
                    This payment will fully settle the invoice balance.
                  </div>
                );
              }
              return null;
            })()}

            <label className="block text-xs font-semibold text-slate-300">
              Payment method
              <select value={collectionMethod} onChange={(e) => setCollectionMethod(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-sm text-white">
                <option value="cash">Cash</option>
                <option value="upi">UPI / QR</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank transfer</option>
              </select>
            </label>
            <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
              <Button type="button" variant="outline" onClick={() => setCollectingInvoice(null)} disabled={!!processingId}>Cancel</Button>
              <Button type="submit" variant="glow" isLoading={!!processingId}>Save payment</Button>
            </div>
          </form>
        </Modal>
      )}

      {canEdit && rentCollection && (
        <Modal isOpen={!!rentCollection} onClose={() => rentProcessing ? undefined : setRentCollection(null)} title="Resident Settlement & Rent Renewal" description={`${rentCollection.guestName} · ${rentCollection.bookingReference}`}>
          <form onSubmit={handleMonthlyRent} className="space-y-4 py-2">
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">Total Resident Debt Breakdown</span>
                {rentCollection.customerId && (
                  <button
                    type="button"
                    onClick={() => setProfileCustomerId(rentCollection.customerId)}
                    className="text-[11px] font-semibold text-amber-300 hover:text-amber-200 underline"
                  >
                    Checklist &amp; Edit Deposit →
                  </button>
                )}
              </div>
              
              {rentCollection.pendingDeposit > 0 && (
                <div className="flex justify-between items-center text-amber-300 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                  <span>🛡️ Pending Security Deposit (Refundable)</span>
                  <strong>₹{rentCollection.pendingDeposit.toLocaleString("en-IN")}</strong>
                </div>
              )}

              {rentCollection.pastOtherBalance > 0 && (
                <div className="flex justify-between items-center text-rose-300 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                  <span>⏳ Past Arrears / Maintenance Balance</span>
                  <strong>₹{rentCollection.pastOtherBalance.toLocaleString("en-IN")}</strong>
                </div>
              )}

              <div className="flex justify-between text-slate-300 pt-1">
                <span>📅 Upcoming 30-day Cycle Rent</span>
                <strong>₹{(rentCollection.cycleRent || rentCollection.amountDue).toLocaleString("en-IN")}</strong>
              </div>

              {rentCollection.discount > 0 && (
                <div className="flex justify-between text-emerald-300">
                  <span>Introductory discount</span>
                  <strong>−₹{rentCollection.discount.toLocaleString("en-IN")}</strong>
                </div>
              )}

              <div className="flex justify-between border-t border-indigo-500/30 pt-2 text-sm font-black text-white">
                <span>Total Amount Due Today</span>
                <span className="text-amber-300">₹{(rentCollection.totalDueWithPast || rentCollection.amountDue).toLocaleString("en-IN")}</span>
              </div>
            </div>

            {rentError && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/50 p-3 text-xs text-rose-200">{rentError}</div>}

            <label className="block text-xs font-semibold text-slate-300">
              Amount received at desk today (₹)
              <input
                required
                type="text"
                inputMode="decimal"
                value={rentAmount}
                onChange={(e) => {
                  const [whole = "", fraction = ""] = e.target.value.replace(/[^\d.]/g, "").split(".");
                  setRentAmount(`${whole.slice(0, 9)}${e.target.value.includes(".") ? `.${fraction.slice(0, 2)}` : ""}`);
                }}
                className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-sm text-white"
              />
            </label>

            {(() => {
              const paying = Number(rentAmount) || 0;
              const totalOwed = rentCollection.totalDueWithPast || rentCollection.amountDue || 0;
              const pendingDep = rentCollection.pendingDeposit || 0;
              const pastBal = rentCollection.pastBalance || 0;
              const cycleR = rentCollection.cycleRent || rentCollection.amountDue || 0;

              if (paying <= 0) return null;

              let allocDeposit = Math.min(paying, pendingDep);
              let allocPast = Math.min(Math.max(0, paying - allocDeposit), pastBal);
              let allocCycleRent = Math.min(Math.max(0, paying - allocDeposit - allocPast), cycleR);

              if (!isSmartAllocation) {
                const manualDep = pendingDep > 0 && customDepositAlloc !== "" ? Number(customDepositAlloc) : null;
                const manualPast = pastBal > 0 && customPastAlloc !== "" ? Number(customPastAlloc) : null;
                const manualRent = customRentAlloc !== "" ? Number(customRentAlloc) : null;

                if (manualDep !== null || manualPast !== null || manualRent !== null) {
                  allocDeposit = manualDep !== null ? Math.min(manualDep, pendingDep, paying) : Math.min(paying, pendingDep);
                  const remAfterDep = Math.max(0, paying - allocDeposit);
                  allocPast = manualPast !== null ? Math.min(manualPast, pastBal, remAfterDep) : Math.min(remAfterDep, pastBal);
                  const remAfterPast = Math.max(0, remAfterDep - allocPast);
                  allocCycleRent = manualRent !== null ? Math.min(manualRent, cycleR, remAfterPast) : Math.min(remAfterPast, cycleR);
                }
              }
              const remTotal = Math.max(0, totalOwed - paying);

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-t border-slate-800 pt-2.5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                      <input
                        type="checkbox"
                        checked={isSmartAllocation}
                        onChange={(e) => {
                          const enabled = e.target.checked;
                          setIsSmartAllocation(enabled);
                          if (!enabled) {
                            const defDep = Math.min(paying, pendingDep);
                            const remAfterDep = Math.max(0, paying - defDep);
                            const defPast = Math.min(remAfterDep, pastBal);
                            const remAfterPast = Math.max(0, remAfterDep - defPast);
                            const defRent = Math.min(remAfterPast, cycleR);
                            setCustomDepositAlloc(String(defDep));
                            setCustomPastAlloc(String(defPast));
                            setCustomRentAlloc(String(defRent));
                          } else {
                            setCustomDepositAlloc("");
                            setCustomPastAlloc("");
                            setCustomRentAlloc("");
                          }
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Smart Waterfall Allocation (Deposit & Arrears First)</span>
                    </label>
                    {!isSmartAllocation && <span className="text-[10px] font-bold text-amber-300">Manual Override</span>}
                  </div>

                  {!isSmartAllocation && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-3 text-xs">
                      <div className="flex justify-between items-center text-amber-200 font-bold">
                        <span>Manual Payment Allocation (Total: ₹{paying.toLocaleString("en-IN")})</span>
                        <span className="text-[10px] text-slate-400">Specify custom split</span>
                      </div>

                      {pendingDep > 0 && (
                        <div>
                          <label className="flex justify-between text-slate-300 font-semibold mb-1 text-[11px]">
                            <span>1. Security Deposit Credit (Pending: ₹{pendingDep.toLocaleString("en-IN")})</span>
                            <span className="text-slate-400">Max: ₹{Math.min(paying, pendingDep).toLocaleString("en-IN")}</span>
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={customDepositAlloc}
                            onChange={(e) => {
                              const [whole = "", fraction = ""] = e.target.value.replace(/[^\d.]/g, "").split(".");
                              setCustomDepositAlloc(`${whole.slice(0, 9)}${e.target.value.includes(".") ? `.${fraction.slice(0, 2)}` : ""}`);
                            }}
                            placeholder={String(Math.min(paying, pendingDep))}
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-xs text-white"
                          />
                        </div>
                      )}

                      {pastBal > 0 && (
                        <div>
                          <label className="flex justify-between text-slate-300 font-semibold mb-1 text-[11px]">
                            <span>2. Clear Past Arrears / Debt (Total: ₹{pastBal.toLocaleString("en-IN")})</span>
                            <span className="text-slate-400">Max: ₹{Math.min(paying, pastBal).toLocaleString("en-IN")}</span>
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={customPastAlloc}
                            onChange={(e) => {
                              const [whole = "", fraction = ""] = e.target.value.replace(/[^\d.]/g, "").split(".");
                              setCustomPastAlloc(`${whole.slice(0, 9)}${e.target.value.includes(".") ? `.${fraction.slice(0, 2)}` : ""}`);
                            }}
                            placeholder={String(Math.min(paying, pastBal))}
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-xs text-white"
                          />
                        </div>
                      )}

                      <div>
                        <label className="flex justify-between text-slate-300 font-semibold mb-1 text-[11px]">
                          <span>3. Credit Towards 30-Day Renewal Rent (Cycle Rent: ₹{cycleR.toLocaleString("en-IN")})</span>
                          <span className="text-slate-400">Max: ₹{Math.min(paying, cycleR).toLocaleString("en-IN")}</span>
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={customRentAlloc}
                          onChange={(e) => {
                            const [whole = "", fraction = ""] = e.target.value.replace(/[^\d.]/g, "").split(".");
                            setCustomRentAlloc(`${whole.slice(0, 9)}${e.target.value.includes(".") ? `.${fraction.slice(0, 2)}` : ""}`);
                          }}
                          placeholder={String(Math.min(paying, cycleR))}
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-xs text-white"
                        />
                      </div>

                      {(() => {
                        const sumAllocated = (pendingDep > 0 ? (Number(customDepositAlloc) || 0) : 0) +
                                             (pastBal > 0 ? (Number(customPastAlloc) || 0) : 0) +
                                             (Number(customRentAlloc) || 0);
                        const diff = paying - sumAllocated;
                        if (diff > 0) {
                          return (
                            <div className="flex items-center justify-between text-[11px] text-amber-300 bg-amber-950/40 p-2 rounded-lg border border-amber-500/20">
                              <span>Remaining unallocated: ₹{diff.toLocaleString("en-IN")}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const currentRent = Number(customRentAlloc) || 0;
                                  setCustomRentAlloc(String(Math.min(cycleR, currentRent + diff)));
                                }}
                                className="text-[10px] underline font-semibold text-amber-200 hover:text-white"
                              >
                                Add to Renewal Rent
                              </button>
                            </div>
                          );
                        }
                        if (diff < 0) {
                          return (
                            <div className="text-[11px] text-rose-300 bg-rose-950/40 p-2 rounded-lg border border-rose-500/20 font-semibold">
                              ⚠️ Total allocated (₹{sumAllocated.toLocaleString("en-IN")}) exceeds amount received (₹{paying.toLocaleString("en-IN")}) by ₹{Math.abs(diff).toLocaleString("en-IN")}.
                            </div>
                          );
                        }
                        return (
                          <div className="text-[11px] text-emerald-300 bg-emerald-950/40 p-2 rounded-lg border border-emerald-500/20 font-semibold flex items-center gap-1">
                            <span>✓</span> Total allocated matches amount received (₹{paying.toLocaleString("en-IN")}).
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-xs space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ledger Allocation Preview</div>
                    {pendingDep > 0 && (
                      <div className="flex justify-between text-slate-300">
                        <span>1. Security Deposit credited:</span>
                        <strong className={allocDeposit >= pendingDep ? "text-emerald-300" : "text-amber-300"}>
                          ₹{allocDeposit.toLocaleString("en-IN")} {allocDeposit >= pendingDep ? "✓ (100% Completed)" : `(₹${(pendingDep - allocDeposit).toLocaleString("en-IN")} remaining)`}
                        </strong>
                      </div>
                    )}
                    {pastBal > 0 && (
                      <div className="flex justify-between text-slate-300">
                        <span>2. Past arrears cleared:</span>
                        <strong className={allocPast >= pastBal ? "text-emerald-300" : "text-amber-300"}>
                          ₹{allocPast.toLocaleString("en-IN")} {allocPast >= pastBal ? "✓ (Cleared)" : `(₹${(pastBal - allocPast).toLocaleString("en-IN")} remaining)`}
                        </strong>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-300">
                      <span>3. Applied towards 30-day renewal:</span>
                      <strong className={allocCycleRent >= cycleR ? "text-emerald-300" : "text-indigo-300"}>
                        ₹{allocCycleRent.toLocaleString("en-IN")} / ₹{cycleR.toLocaleString("en-IN")}
                      </strong>
                    </div>
                  </div>

                  {allocCycleRent === 0 && paying > 0 && (
                    <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3.5 space-y-2 text-xs">
                      <div className="font-bold text-rose-300 flex items-center gap-1.5">
                        <span>⚠️ Zero-Rent Extension Notice</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        ₹0 of this ₹{paying.toLocaleString("en-IN")} payment is credited to the upcoming month's rent (it only pays past deposit/arrears). Advancing this stay by 30 days will leave the full rent (₹{cycleR.toLocaleString("en-IN")}) outstanding.
                      </p>
                      <label className="flex items-center gap-2 cursor-pointer pt-1 font-semibold text-rose-200">
                        <input
                          type="checkbox"
                          checked={confirmZeroRentExtension}
                          onChange={(e) => setConfirmZeroRentExtension(e.target.checked)}
                          className="rounded text-rose-600 focus:ring-rose-500"
                        />
                        <span>Owner approves advancing stay by 30 days despite ₹0 rent paid</span>
                      </label>
                    </div>
                  )}

                  {remTotal > 0 ? (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-3">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-amber-200">Remaining Balance</div>
                        <div className="mt-0.5 text-xl font-black text-amber-300">₹{remTotal.toLocaleString("en-IN")}</div>
                        <p className="mt-0.5 text-[11px] text-slate-400">Set the date the resident agreed to pay the remaining balance.</p>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-300">Balance due date *</label>
                        <DatePicker
                          value={rentDueDate}
                          onChange={setRentDueDate}
                          min={new Date().toISOString().slice(0, 10)}
                          triggerClassName="p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs w-full text-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs font-semibold text-emerald-300">
                      ✓ Full payment · All debts cleared & stay extended by 30 days!
                    </div>
                  )}
                </div>
              );
            })()}

            <label className="block text-xs font-semibold text-slate-300">
              Payment method
              <select value={rentMethod} onChange={(e) => setRentMethod(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-sm text-white">
                <option value="CASH">Cash</option>
                <option value="UPI">UPI / QR</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
              </select>
            </label>
            <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
              <Button type="button" variant="outline" onClick={() => setRentCollection(null)} disabled={rentProcessing}>Cancel</Button>
              <Button type="submit" variant="glow" isLoading={rentProcessing}>Record payment & extend</Button>
            </div>
          </form>
        </Modal>
      )}

      <CustomerProfileModal
        isOpen={!!profileCustomerId}
        onClose={() => setProfileCustomerId(null)}
        customerId={profileCustomerId}
        canEdit={canEdit}
        onUpdated={() => window.location.reload()}
      />
    </div>
  );
};

export default PaymentsClient;
