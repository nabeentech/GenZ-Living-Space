"use client";

import React, { useState, useMemo } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import dynamic from "next/dynamic";

const ShiftRoomModal = dynamic(() => import("@/components/admin/ShiftRoomModal"), {
  ssr: false,
});
const CustomerProfileModal = dynamic(() => import("@/components/admin/CustomerProfileModal"), {
  ssr: false,
});
import { Search, Mail, Phone, User, RefreshCw, Shield, CreditCard, Car } from "lucide-react";

interface CustomerDirectoryClientProps {
  customers: any[];
  canEdit?: boolean;
}

export const CustomerDirectoryClient: React.FC<CustomerDirectoryClientProps> = ({ customers, canEdit = true }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "recent" | "bookings">("recent");
  const [checklistFilter, setChecklistFilter] = useState<"all" | "missing_aadhaar" | "missing_email" | "deposit_due">("all");
  const [shiftBookingId, setShiftBookingId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 18;

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let result = customers.filter((customer) => {
      if (checklistFilter === "missing_aadhaar") {
        const valid = customer.govtIdType === "AADHAAR"
          ? /^\d{12}$/.test(customer.govtIdNumber || "")
          : Boolean(customer.govtIdNumber);
        if (valid) return false;
      } else if (checklistFilter === "missing_email") {
        if (customer.email && !customer.email.endsWith("@genzlivingspace.local")) return false;
      } else if (checklistFilter === "deposit_due") {
        const active = customer.bookings?.find((b: any) => ["CHECKED_IN", "CONFIRMED"].includes(b.bookingStatus));
        if (!active || (active.securityDeposit || 0) <= (active.paidSecurityDeposit || 0)) return false;
      }

      if (!term) return true;
      const name = (customer.name || "").toLowerCase();
      const email = (customer.email || "").toLowerCase();
      const phone = (customer.phone || "").toLowerCase();
      const vehicle = (customer.vehicleNumber || "").toLowerCase();
      const aadhaar = (customer.govtIdNumber || "").toLowerCase();
      return name.includes(term) || email.includes(term) || phone.includes(term) || vehicle.includes(term) || aadhaar.includes(term);
    });

    // Sort customers
    if (sortBy === "name") {
      result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (sortBy === "bookings") {
      result.sort((a, b) => (b.bookings?.length || 0) - (a.bookings?.length || 0));
    } else {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [customers, searchTerm, sortBy, checklistFilter]);

  // Reset page to 1 when search or sort criteria change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, checklistFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  const getGenderBadgeVariant = (gender: string) => {
    if (!gender) return "default";
    const g = gender.toUpperCase();
    return g === "MALE" ? "default" : g === "FEMALE" ? "available" : "occupied";
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-slate-800 bg-[#111827]/85 space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-700">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sort By:</span>
            {[
              { id: "recent", label: "Recently Joined" },
              { id: "name", label: "Name (A-Z)" },
              { id: "bookings", label: "Most Bookings" },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setSortBy(option.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  sortBy === option.id
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Checklist:</span>
            {[
              { id: "all", label: "All" },
              { id: "missing_aadhaar", label: "⚠️ Missing Aadhaar" },
              { id: "missing_email", label: "📧 No Gmail" },
              { id: "deposit_due", label: "🛡️ Deposit Due" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setChecklistFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  checklistFilter === f.id
                    ? "bg-amber-500/20 border border-amber-400/50 text-amber-200"
                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-400">
          Showing <span className="font-bold text-white">{filteredCustomers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to{" "}
          <span className="font-bold text-white">
            {Math.min(currentPage * pageSize, filteredCustomers.length)}
          </span>{" "}
          of <span className="font-bold text-white">{filteredCustomers.length}</span> guests {filteredCustomers.length !== customers.length && `(filtered from ${customers.length})`}
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedCustomers.map((customer) => {
          const activeBooking = customer.bookings?.find((b: any) =>
            ["CHECKED_IN", "CONFIRMED"].includes(b.bookingStatus)
          );

          return (
            <div
              key={customer.id}
              onClick={() => setSelectedCustomerId(customer.id)}
              className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition cursor-pointer space-y-3 group hover:bg-slate-900/80"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-bold text-white text-sm sm:text-base group-hover:text-indigo-300 transition">
                    {customer.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {customer.gender && (
                      <Badge variant={getGenderBadgeVariant(customer.gender)} size="sm">
                        {customer.gender}
                      </Badge>
                    )}
                    {activeBooking ? (
                      <Badge variant="indigo" size="sm">
                        In-House (Rm {activeBooking.room?.roomNumber || "Active"})
                      </Badge>
                    ) : (
                      customer.role === "CUSTOMER" && (
                        <Badge variant="default" size="sm">
                          Guest
                        </Badge>
                      )
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-indigo-400">
                    {customer.bookings?.length || 0}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Bookings</div>
                </div>
              </div>

              {/* Contact Info & Checklist Pills */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2 text-slate-400 group-hover:text-slate-300 transition">
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate">{customer.email || "No email"}</span>
                </div>
                {customer.phone && (
                  <div className="flex items-center gap-2 text-slate-400 group-hover:text-slate-300 transition">
                    <Phone className="w-3 h-3 shrink-0" />
                    <span>{customer.phone}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold">
                <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 border ${
                  (customer.govtIdType === "AADHAAR" ? /^\d{12}$/.test(customer.govtIdNumber || "") : Boolean(customer.govtIdNumber))
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                }`}>
                  <CreditCard className="w-2.5 h-2.5" />
                  {customer.govtIdNumber ? "Aadhaar ✓" : "No Aadhaar"}
                </span>
                {activeBooking && activeBooking.securityDeposit > 0 && (
                  <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 border ${
                    (activeBooking.paidSecurityDeposit || 0) >= activeBooking.securityDeposit
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                  }`}>
                    <Shield className="w-2.5 h-2.5" />
                    {(activeBooking.paidSecurityDeposit || 0) >= activeBooking.securityDeposit
                      ? "Deposit ✓"
                      : `Dep Due ₹${(activeBooking.securityDeposit - (activeBooking.paidSecurityDeposit || 0)).toLocaleString("en-IN")}`}
                  </span>
                )}
                {customer.hasVehicle && (
                  <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 border border-indigo-500/30 bg-indigo-500/10 text-indigo-200">
                    <Car className="w-2.5 h-2.5" />
                    {customer.vehicleNumber || "Vehicle"}
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="pt-2 border-t border-slate-800 grid grid-cols-3 gap-2">
                <div className="text-center">
                  <div className="text-sm font-bold text-white">
                    {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "2-digit",
                    }) : "—"}
                  </div>
                  <div className="text-[9px] text-slate-500 uppercase font-bold">Joined</div>
                </div>
                {customer.bookings?.[0] && (
                  <div className="text-center">
                    <div className="text-sm font-bold text-indigo-300">
                      {new Date(customer.bookings[0].checkInDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase font-bold">Last Stay</div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-sm font-bold text-emerald-300">
                    {customer.bookings?.filter((b: any) => b.bookingStatus === "CHECKED_OUT").length || 0}
                  </div>
                  <div className="text-[9px] text-slate-500 uppercase font-bold">Completed</div>
                </div>
              </div>

              {/* View Button */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="glow"
                  size="sm"
                  className="flex-1 text-xs"
                >
                  View Details →
                </Button>
                {canEdit && activeBooking && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShiftBookingId(activeBooking.id);
                    }}
                    leftIcon={<RefreshCw className="w-3 h-3" />}
                  >
                    Shift Room
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {filteredCustomers.length > 0 && (
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-[#111827]/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Showing <span className="font-bold text-white">{(currentPage - 1) * pageSize + 1}</span> to{" "}
            <span className="font-bold text-white">
              {Math.min(currentPage * pageSize, filteredCustomers.length)}
            </span>{" "}
            of <span className="font-bold text-white">{filteredCustomers.length}</span> guests
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No customers found matching your search</p>
        </div>
      )}

      {/* Unified Customer Profile, Checklist & Payment Timeline Modal */}
      <CustomerProfileModal
        isOpen={!!selectedCustomerId}
        onClose={() => setSelectedCustomerId(null)}
        customerId={selectedCustomerId}
        canEdit={canEdit}
        onUpdated={() => window.location.reload()}
      />

      {shiftBookingId && (
        <ShiftRoomModal
          isOpen={!!shiftBookingId}
          onClose={() => setShiftBookingId(null)}
          bookingId={shiftBookingId}
          onSuccess={() => window.location.reload()}
        />
      )}
    </div>
  );
};

export default CustomerDirectoryClient;
