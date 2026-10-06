"use client";

import React, { useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
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
  const [activeTab, setActiveTab] = useState<"payments" | "refunds" | "invoices">("payments");
  const [payments, setPayments] = useState(initialPayments);
  const [refunds, setRefunds] = useState(initialRefunds);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleRefundAction = async (refundId: string, action: "APPROVE" | "REJECT") => {
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
            ? { ...r, status: action === "APPROVE" ? "PROCESSED" : "REJECTED" }
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
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            Processed by {r.processedBy || "Finance"}
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
                  <th className="p-3.5">GST (12%)</th>
                  <th className="p-3.5">Total Amount</th>
                  <th className="p-3.5 text-right">View / Print</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {invoices.map((inv) => (
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
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/confirmation?bookingRef=${inv.booking?.bookingReference}`}>
                          <Button variant="ghost" size="sm" leftIcon={<Printer className="w-3.5 h-3.5" />}>
                            View
                          </Button>
                        </Link>
                        <a href={`/api/invoices/${inv.bookingId}/pdf`} download>
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
    </div>
  );
};

export default PaymentsClient;
