"use client";

import React, { useState } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { HelpCircle, CheckCircle2, MessageSquare, Clock, Send } from "lucide-react";

interface ComplaintsClientProps {
  initialTickets: any[];
}

export const ComplaintsClient: React.FC<ComplaintsClientProps> = ({
  initialTickets,
}) => {
  const [tickets, setTickets] = useState(initialTickets);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [replyText, setReplyText] = useState("");
  const [newStatus, setNewStatus] = useState("RESOLVED");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredTickets = tickets.filter(
    (t) => statusFilter === "all" || t.status === statusFilter
  );

  const handleOpenReply = (ticket: any) => {
    setSelectedTicket(ticket);
    setReplyText(ticket.staffReply || "");
    setNewStatus(ticket.status === "RESOLVED" ? "RESOLVED" : "IN_PROGRESS");
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(
        `/api/admin/complaints/${selectedTicket.id}/reply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ staffReply: replyText, status: newStatus }),
        }
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to reply");
      }

      setTickets((prev) =>
        prev.map((t) =>
          t.id === selectedTicket.id
            ? { ...t, staffReply: replyText, status: newStatus }
            : t
        )
      );

      setSelectedTicket(null);
      setReplyText("");
    } catch (err: any) {
      alert(err.message || "Error submitting reply");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-[#111827]/80 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400">Filter by Status:</span>
        <div className="flex gap-2">
          {["all", "OPEN", "IN_PROGRESS", "RESOLVED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition uppercase ${
                statusFilter === st
                  ? "bg-indigo-600 text-white shadow-glow"
                  : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-[#111827]/80 space-y-4">
        {filteredTickets.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No tickets match your filter criteria.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((t) => (
              <div
                key={t.id}
                className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-400">
                      {t.ticketNumber}
                    </span>
                    <Badge variant="indigo" size="sm">
                      {t.category}
                    </Badge>
                    <Badge
                      variant={
                        t.priority === "HIGH" || t.priority === "URGENT"
                          ? "danger"
                          : "default"
                      }
                      size="sm"
                    >
                      {t.priority}
                    </Badge>
                    <Badge
                      variant={
                        t.status === "RESOLVED"
                          ? "available"
                          : t.status === "OPEN"
                          ? "warning"
                          : "indigo"
                      }
                      size="sm"
                    >
                      {t.status}
                    </Badge>
                  </div>

                  <span className="text-xs text-slate-400 font-medium">
                    {t.hostel.name} • {new Date(t.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-white">{t.subject}</h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {t.description}
                  </p>
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Resident: {t.customer.name} ({t.customer.phone || t.customer.email})
                  </span>
                </div>

                {t.staffReply && (
                  <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200">
                    <span className="font-bold block text-white mb-0.5">
                      Staff Response:
                    </span>
                    {t.staffReply}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    variant="glow"
                    size="sm"
                    onClick={() => handleOpenReply(t)}
                    leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
                  >
                    Reply / Update Ticket
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {selectedTicket && (
        <Modal
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          title={`Reply to Ticket #${selectedTicket.ticketNumber}`}
          description={`Resident: ${selectedTicket.customer.name} • ${selectedTicket.subject}`}
        >
          <form onSubmit={handleSendReply} className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                Staff Response to Resident
              </label>
              <textarea
                rows={4}
                required
                placeholder="Type your response to the resident..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                Update Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none"
              >
                <option value="IN_PROGRESS">IN_PROGRESS (Investigating)</option>
                <option value="RESOLVED">RESOLVED (Issue Fixed / Answered)</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setSelectedTicket(null)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="glow"
                size="sm"
                type="submit"
                isLoading={isSubmitting}
                rightIcon={<Send className="w-3.5 h-3.5" />}
              >
                Send Reply & Update
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default ComplaintsClient;
