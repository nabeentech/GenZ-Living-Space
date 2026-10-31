"use client";

import React, { useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { CreditCard, CheckCircle2, XCircle, Printer, Download, AlertCircle } from "lucide-react";

interface PaymentsClientProps {
  initialPayments: any[];
  initialRefunds: any[];
  invoices: any[];
}

export const PaymentsClient: React.FC<PaymentsClientProps> = ({
  initialPayments,
  initialRefunds,
  invoices,
}) => {
  const [activeTab, setActiveTab] = useState<"due" | "payments" | "refunds" | "invoices">("due");
  const [payments, setPayments] = useState(initialPayments);
  const [refunds, setRefunds] = useState(initialRefunds);
  const [invoiceRows, setInvoiceRows] = useState(invoices);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [collectingInvoice, setCollectingInvoice] = useState<any | null>(null);
  const [collectionAmount, setCollectionAmount] = useState("");
  const [collectionMethod, setCollectionMethod] = useState("cash");
  const [collectionError, setCollectionError] = useState("");
  const [collectionSuccess, setCollectionSuccess] = useState("");

  const dueInvoices = invoiceRows.filter((invoice) =>
    invoice.status !== "CANCELLED" &&
    !["CANCELLED", "REFUNDED"].includes(invoice.booking?.bookingStatus) &&
    Math.round((invoice.totalAmount - invoice.paidAmount) * 100) > 0
  );
  const outstandingTotal = dueInvoices.reduce((sum, invoice) => sum + Math.max(0, invoice.totalAmount - invoice.paidAmount), 0);

  const openCollection = (invoice: any) => {
    setCollectingInvoice(invoice);
    setCollectionAmount((invoice.totalAmount - invoice.paidAmount).toFixed(2).replace(/\.00$/, ""));
    setCollectionMethod("cash");
    setCollectionError("");
    setCollectionSuccess("");
  };

  const handleCollectBalance = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!collectingInvoice) return;
    setProcessingId(collectingInvoice.id);
    setCollectionError("");
    try {
      const response = await fetch("/api/admin/payments/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: collectingInvoice.bookingId,
          invoiceId: collectingInvoice.id,
          amount: Number(collectionAmount),
          paymentMethod: collectionMethod,
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

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("due")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === "due" ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20" : "text-slate-400 hover:text-white"}`}
        >
          Outstanding ({dueInvoices.length}) · ₹{outstandingTotal.toLocaleString("en-IN")}
        </button>
        <button
          onClick={() => setActiveTab("payments")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "payments"
              ? "bg-indigo-600 text-white shadow-glow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Captured Transactions ({payments.length})
        </button>
        <button
          onClick={() => setActiveTab("refunds")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "refunds"
              ? "bg-indigo-600 text-white shadow-glow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Refund Requests Queue ({refunds.length})
        </button>
        <button
          onClick={() => setActiveTab("invoices")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "invoices"
              ? "bg-indigo-600 text-white shadow-glow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Official Tax Invoices ({invoices.length})
        </button>
      </div>

      {collectionSuccess && <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/60 p-3 text-sm text-emerald-200">{collectionSuccess}</div>}

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
                {dueInvoices.length === 0 ? <tr><td colSpan={8} className="p-10 text-center text-slate-500">No outstanding balances.</td></tr> : dueInvoices.map((invoice) => {
                  const balance = Math.max(0, invoice.totalAmount - invoice.paidAmount);
                  const overdue = new Date(invoice.dueDate).getTime() < new Date(new Date().toDateString()).getTime();
                  return <tr key={invoice.id} className="hover:bg-slate-900/50">
                    <td className="p-3"><span className="block font-mono font-bold text-indigo-300">{invoice.booking?.bookingReference || "—"}</span><span className="mt-1 block text-[10px] text-slate-500">{invoice.invoiceNumber}</span></td>
                    <td className="p-3 font-semibold text-white">{invoice.booking?.guestName || invoice.booking?.guestEmail}</td>
                    <td className="p-3">{invoice.hostel?.name}</td>
                    <td className="p-3"><span className={overdue ? "font-semibold text-rose-300" : "text-slate-300"}>{new Date(invoice.dueDate).toLocaleDateString()}</span>{overdue && <span className="ml-1 text-[10px] text-rose-400">Overdue</span>}</td>
                    <td className="p-3">₹{invoice.totalAmount.toLocaleString("en-IN")}</td>
                    <td className="p-3 text-emerald-300">₹{invoice.paidAmount.toLocaleString("en-IN")}</td>
                    <td className="p-3 font-black text-amber-300">₹{balance.toLocaleString("en-IN")}</td>
                    <td className="p-3 text-right"><Button size="sm" variant="glow" disabled={processingId === invoice.id} onClick={() => openCollection(invoice)}>Record payment</Button></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
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
                {payments.map((p) => (
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
                  refunds.map((r) => (
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
                        {r.status === "REQUESTED" ? (
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
                {invoiceRows.map((inv) => (
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
        </div>
      )}

      {collectingInvoice && (
        <Modal isOpen={!!collectingInvoice} onClose={() => processingId ? undefined : setCollectingInvoice(null)} title="Record balance payment" description={`Booking ${collectingInvoice.booking?.bookingReference} · ${collectingInvoice.booking?.guestName}`}>
          <form onSubmit={handleCollectBalance} className="space-y-4 py-2">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs">
              <div className="flex justify-between text-slate-300"><span>Invoice total</span><strong>₹{collectingInvoice.totalAmount.toLocaleString("en-IN")}</strong></div>
              <div className="mt-1 flex justify-between text-slate-300"><span>Already paid</span><strong>₹{collectingInvoice.paidAmount.toLocaleString("en-IN")}</strong></div>
              <div className="mt-2 flex justify-between border-t border-amber-500/20 pt-2 font-bold text-amber-200"><span>Balance</span><strong>₹{(collectingInvoice.totalAmount - collectingInvoice.paidAmount).toLocaleString("en-IN")}</strong></div>
            </div>
            {collectionError && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/50 p-3 text-xs text-rose-200">{collectionError}</div>}
            <label className="block text-xs font-semibold text-slate-300">Amount received now (₹)<input required type="text" inputMode="decimal" value={collectionAmount} onChange={(e) => { const [whole = "", fraction = ""] = e.target.value.replace(/[^\d.]/g, "").split("."); setCollectionAmount(`${whole.slice(0, 9)}${e.target.value.includes(".") ? `.${fraction.slice(0, 2)}` : ""}`); }} className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-sm text-white" /></label>
            <label className="block text-xs font-semibold text-slate-300">Payment method<select value={collectionMethod} onChange={(e) => setCollectionMethod(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-sm text-white"><option value="cash">Cash</option><option value="upi">UPI / QR</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option></select></label>
            <div className="flex justify-end gap-2 border-t border-slate-800 pt-3"><Button type="button" variant="outline" onClick={() => setCollectingInvoice(null)} disabled={!!processingId}>Cancel</Button><Button type="submit" variant="glow" isLoading={!!processingId}>Save payment</Button></div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default PaymentsClient;
