import React from "react";
import prisma from "@/lib/prisma";
import Badge from "@/components/ui/Badge";
import { FileText, Clock, User, Shield } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminAuditLogsPage() {
  const logs = await prisma.auditLog.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    include: { user: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">
          Security & Compliance
        </span>
        <h1 className="text-3xl font-black text-white">System Audit Trail</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Immutable operational log recording bed reassignments, check-in operations, refunds, and financial alterations.
        </p>
      </div>

      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-[#111827]/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Actor / User</th>
                <th className="p-3.5">Action Event</th>
                <th className="p-3.5">Entity</th>
                <th className="p-3.5">Entity ID</th>
                <th className="p-3.5">Details (New Value)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No audit logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/50">
                    <td className="p-3.5 text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3.5 font-bold text-white whitespace-nowrap">
                      {log.userName}
                    </td>
                    <td className="p-3.5">
                      <Badge
                        variant={
                          log.action.includes("CHECK_IN")
                            ? "available"
                            : log.action.includes("CHECK_OUT")
                            ? "indigo"
                            : log.action.includes("REFUND")
                            ? "danger"
                            : "default"
                        }
                        size="sm"
                      >
                        {log.action}
                      </Badge>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-200">
                      {log.entity}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-400">
                      {log.entityId}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-300 max-w-xs truncate">
                      {log.newValue || log.previousValue || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
