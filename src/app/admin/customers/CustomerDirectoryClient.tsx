"use client";

import React, { useState, useMemo } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Search, Mail, Phone, MapPin, Calendar, BookOpen, User, MessageCircle } from "lucide-react";

interface CustomerDirectoryClientProps {
  customers: any[];
}

export const CustomerDirectoryClient: React.FC<CustomerDirectoryClientProps> = ({ customers }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "recent" | "bookings">("recent");

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    let result = customers.filter((customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort customers
    if (sortBy === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "bookings") {
      result.sort((a, b) => b.bookings.length - a.bookings.length);
    } else {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [customers, searchTerm, sortBy]);

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

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sort By:</span>
          {[
            { id: "recent", label: "Recently Joined", icon: "📅" },
            { id: "name", label: "Name (A-Z)", icon: "🔤" },
            { id: "bookings", label: "Most Bookings", icon: "📊" },
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

        <div className="text-xs text-slate-400">
          Showing <span className="font-bold text-white">{filteredCustomers.length}</span> of{" "}
          <span className="font-bold text-white">{customers.length}</span> customers
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((customer) => (
          <div
            key={customer.id}
            onClick={() => setSelectedCustomer(customer)}
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
                  {customer.role === "CUSTOMER" && (
                    <Badge variant="indigo" size="sm">
                      Guest
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-indigo-400">
                  {customer.bookings.length}
                </div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Bookings</div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-slate-400 group-hover:text-slate-300 transition">
                <Mail className="w-3 h-3 shrink-0" />
                <span className="truncate">{customer.email}</span>
              </div>
              {customer.phone && (
                <div className="flex items-center gap-2 text-slate-400 group-hover:text-slate-300 transition">
                  <Phone className="w-3 h-3 shrink-0" />
                  <span>{customer.phone}</span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="pt-2 border-t border-slate-800 grid grid-cols-3 gap-2">
              <div className="text-center">
                <div className="text-sm font-bold text-white">
                  {new Date(customer.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "2-digit",
                  })}
                </div>
                <div className="text-[9px] text-slate-500 uppercase font-bold">Joined</div>
              </div>
              {customer.bookings[0] && (
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
                  {customer.bookings.filter((b: any) => b.bookingStatus === "CHECKED_OUT").length}
                </div>
                <div className="text-[9px] text-slate-500 uppercase font-bold">Completed</div>
              </div>
            </div>

            {/* View Button */}
            <Button
              variant="glow"
              size="sm"
              className="w-full text-xs"
            >
              View Details →
            </Button>
          </div>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No customers found matching your search</p>
        </div>
      )}

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <Modal
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          title={selectedCustomer.name}
          description={`Guest Profile & Booking History`}
        >
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto">
            {/* Contact Information */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Email:</span>
                <span className="font-semibold text-white">{selectedCustomer.email}</span>
              </div>
              {selectedCustomer.phone && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Phone:</span>
                  <span className="font-semibold text-white">{selectedCustomer.phone}</span>
                </div>
              )}
              {selectedCustomer.gender && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Gender:</span>
                  <Badge variant={getGenderBadgeVariant(selectedCustomer.gender)} size="sm">
                    {selectedCustomer.gender}
                  </Badge>
                </div>
              )}
              {selectedCustomer.dateOfBirth && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Date of Birth:</span>
                  <span className="font-semibold text-white">
                    {new Date(selectedCustomer.dateOfBirth).toLocaleDateString("en-IN")}
                  </span>
                </div>
              )}
              {selectedCustomer.govtIdType && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Govt ID Type:</span>
                  <span className="font-semibold text-white">{selectedCustomer.govtIdType}</span>
                </div>
              )}
              {selectedCustomer.govtIdNumber && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Govt ID Number:</span>
                  <span className="font-mono font-semibold text-indigo-300">{selectedCustomer.govtIdNumber}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                <span className="text-slate-400">Member Since:</span>
                <span className="font-semibold text-white">
                  {new Date(selectedCustomer.createdAt).toLocaleDateString("en-IN")}
                </span>
              </div>
            </div>

            {/* Booking Statistics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-indigo-950 border border-indigo-500/30 text-center">
                <div className="text-xl font-bold text-indigo-300">{selectedCustomer.bookings.length}</div>
                <div className="text-xs text-slate-400 mt-1">Total Bookings</div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-500/30 text-center">
                <div className="text-xl font-bold text-emerald-300">
                  {selectedCustomer.bookings.filter((b: any) => b.bookingStatus === "CHECKED_OUT").length}
                </div>
                <div className="text-xs text-slate-400 mt-1">Completed</div>
              </div>
              <div className="p-3 rounded-xl bg-blue-950 border border-blue-500/30 text-center">
                <div className="text-xl font-bold text-blue-300">
                  {selectedCustomer.bookings.filter((b: any) => 
                    b.bookingStatus === "CHECKED_IN" || b.bookingStatus === "CONFIRMED"
                  ).length}
                </div>
                <div className="text-xs text-slate-400 mt-1">Active</div>
              </div>
            </div>

            {/* Recent Bookings */}
            {selectedCustomer.bookings.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-indigo-300 uppercase tracking-wider">Recent Bookings</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedCustomer.bookings.map((booking: any, index: number) => (
                    <div
                      key={booking.id}
                      className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{booking.hostel?.name || "Unknown Hostel"}</span>
                        <Badge 
                          variant={
                            booking.bookingStatus === "CHECKED_OUT" ? "available" :
                            booking.bookingStatus === "CHECKED_IN" ? "occupied" :
                            "reserved"
                          }
                          size="sm"
                        >
                          {booking.bookingStatus}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Room {booking.room?.roomNumber || "—"} • {booking.bed?.bedNumber || "—"}</span>
                        <span className="font-semibold text-indigo-300">₹{booking.totalAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-4 text-slate-500">
                        <span>
                          {new Date(booking.checkInDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "2-digit",
                          })}{" "}
                          →{" "}
                          {new Date(booking.checkOutDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCustomer(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CustomerDirectoryClient;
