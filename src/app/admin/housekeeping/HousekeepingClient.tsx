"use client";

import React, { useState } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Sparkle, CheckCircle2, Clock, AlertTriangle, User, RefreshCw } from "lucide-react";

interface HousekeepingClientProps {
  initialTasks: any[];
  hostels: any[];
}

export const HousekeepingClient: React.FC<HousekeepingClientProps> = ({
  initialTasks,
  hostels,
}) => {
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedHostel, setSelectedHostel] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredTasks = tasks.filter(
    (t) => selectedHostel === "all" || t.hostelId === selectedHostel
  );

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    setUpdatingId(taskId);
    try {
      const res = await fetch(`/api/admin/housekeeping/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update status");
      }

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
    } catch (err: any) {
      alert(err.message || "Update error");
    } finally {
      setUpdatingId(null);
    }
  };

  const columns = [
    { id: "DIRTY", title: "Needs Cleaning", badgeVariant: "danger" as const },
    { id: "CLEANING", title: "In Progress", badgeVariant: "cleaning" as const },
    { id: "CLEAN", title: "Cleaned & Sanitized", badgeVariant: "available" as const },
    { id: "INSPECTED", title: "Inspected & Ready", badgeVariant: "available" as const },
  ];

  return (
    <div className="space-y-6">
      {/* Property Filter */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-[#111827]/80 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400">Filter by Hostel:</span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedHostel("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              selectedHostel === "all"
                ? "bg-indigo-600 text-white shadow-glow"
                : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            All Hostels
          </button>
          {hostels.map((h) => (
            <button
              key={h.id}
              onClick={() => setSelectedHostel(h.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedHostel === h.id
                  ? "bg-indigo-600 text-white shadow-glow"
                  : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              {h.name}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {columns.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.id);
          return (
            <div
              key={col.id}
              className="glass-panel p-5 rounded-3xl border border-slate-800 bg-[#101626]/80 flex flex-col space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="font-bold text-sm text-white">{col.title}</span>
                <Badge variant={col.badgeVariant} size="sm">
                  {colTasks.length}
                </Badge>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
                {colTasks.length === 0 ? (
                  <div className="p-8 text-center text-slate-600 text-xs">
                    No items in this queue
                  </div>
                ) : (
                  colTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">
                          Room {t.room.roomNumber}{" "}
                          {t.bed ? `(${t.bed.bedNumber})` : ""}
                        </span>
                        <Badge variant="default" size="sm">
                          {t.taskType}
                        </Badge>
                      </div>

                      <p className="text-xs text-slate-400 font-medium">
                        {t.hostel.name}
                      </p>

                      {t.notes && (
                        <p className="text-[11px] text-slate-300 italic bg-slate-950 p-2 rounded-lg">
                          "{t.notes}"
                        </p>
                      )}

                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800">
                        {col.id === "DIRTY" && (
                          <Button
                            variant="glow"
                            size="sm"
                            className="w-full text-xs py-1.5"
                            isLoading={updatingId === t.id}
                            onClick={() => handleUpdateStatus(t.id, "CLEANING")}
                          >
                            Start Cleaning
                          </Button>
                        )}
                        {col.id === "CLEANING" && (
                          <Button
                            variant="glow"
                            size="sm"
                            className="w-full text-xs py-1.5"
                            isLoading={updatingId === t.id}
                            onClick={() => handleUpdateStatus(t.id, "CLEAN")}
                          >
                            Mark Clean & Fresh
                          </Button>
                        )}
                        {col.id === "CLEAN" && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-full text-xs py-1.5"
                            isLoading={updatingId === t.id}
                            onClick={() => handleUpdateStatus(t.id, "INSPECTED")}
                          >
                            Pass Inspection
                          </Button>
                        )}
                        {col.id === "INSPECTED" && (
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mx-auto">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Ready for Guest Check-In
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HousekeepingClient;
