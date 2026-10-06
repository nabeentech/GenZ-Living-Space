import React from "react";
import prisma from "@/lib/prisma";
import BookingsManagementClient from "./BookingsManagementClient";

export const dynamic = "force-dynamic";

interface BookingsPageProps {
  searchParams: {
    search?: string;
    hostelId?: string;
    status?: string;
  };
}

export default async function AdminBookingsPage({ searchParams }: BookingsPageProps) {
  const { search, hostelId, status } = searchParams;

  const where: any = {};
  if (hostelId && hostelId !== "all") {
    where.hostelId = hostelId;
  }
  if (status && status !== "all") {
    where.bookingStatus = status;
  }
  if (search) {
    where.OR = [
      { bookingReference: { contains: search } },
      { guestName: { contains: search } },
      { guestPhone: { contains: search } },
      { guestEmail: { contains: search } },
    ];
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      hostel: true,
      room: { include: { roomType: true } },
      bed: true,
      payments: true,
      invoices: true,
      refunds: true,
      extensions: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const hostels = await prisma.hostel.findMany({
    select: { id: true, name: true, city: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">
          Reservations Ledger
        </span>
        <h1 className="text-3xl font-black text-white">Bookings Management</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Search, filter, re-assign beds, cancel reservations, and issue refunds.
        </p>
      </div>

      <BookingsManagementClient
        initialBookings={bookings}
        hostels={hostels}
        initialSearch={search}
      />
    </div>
  );
}
