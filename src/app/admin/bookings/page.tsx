import React from "react";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { canAccessModule, canUserEdit, getFirstAllowedAdminRoute, isFinancialsHidden } from "@/lib/permissions";
import BookingsManagementClient from "./BookingsManagementClient";

export const dynamic = "force-dynamic";

interface BookingsPageProps {
  searchParams: Promise<{
    search?: string;
    hostelId?: string;
    status?: string;
  }>;
}

export default async function AdminBookingsPage({ searchParams }: BookingsPageProps) {
  const user = await getSessionUser();
  if (!user || !canAccessModule(user, "bookings")) {
    redirect(getFirstAllowedAdminRoute(user));
  }
  const canEdit = canUserEdit(user);
  const hideFinancials = isFinancialsHidden(user);

  const { search, hostelId, status } = await searchParams;

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

  const [bookings, hostels] = await Promise.all([
    prisma.booking.findMany({
      where,
      select: {
        id: true,
        bookingReference: true,
        customerId: true,
        hostelId: true,
        roomId: true,
        bedId: true,
        checkInDate: true,
        checkOutDate: true,
        stayType: true,
        isOpenEnded: true,
        guestsCount: true,
        baseAmount: true,
        taxAmount: true,
        serviceFee: true,
        paidMaintenanceFee: true,
        securityDeposit: true,
        paidSecurityDeposit: true,
        discountAmount: true,
        customDiscountAmount: true,
        monthlyRentDiscountAmount: true,
        monthlyRentDiscountMonths: true,
        monthlyRentDiscountCyclesApplied: true,
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
        bookingStatus: true,
        paymentStatus: true,
        guestName: true,
        guestEmail: true,
        guestPhone: true,
        guestGovtId: true,
        guestDetails: true,
        createdAt: true,
        hostel: { select: { id: true, name: true, city: true } },
        room: {
          select: {
            id: true,
            roomNumber: true,
            floor: true,
            isAC: true,
            roomType: {
              select: {
                id: true,
                name: true,
                basePrice: true,
                monthlyPrice: true,
                pricePerDayNonAC: true,
                price7DaysNonAC: true,
                price10DaysNonAC: true,
                price15DaysNonAC: true,
                price30DaysNonAC: true,
                pricePerDayAC: true,
                price7DaysAC: true,
                price10DaysAC: true,
                price15DaysAC: true,
                price30DaysAC: true,
              },
            },
          },
        },
        bed: { select: { id: true, bedNumber: true } },
        payments: {
          select: {
            id: true,
            amount: true,
            gateway: true,
            paymentMethod: true,
            status: true,
            createdAt: true,
          },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            paidAmount: true,
            balanceDue: true,
            dueDate: true,
            status: true,
          },
        },
        refunds: {
          select: { id: true, amount: true, status: true, reason: true, requestedAt: true },
        },
        extensions: {
          orderBy: { createdAt: "desc" },
          select: { id: true, originalCheckOut: true, newCheckOut: true, additionalAmount: true, status: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 400,
    }),
    prisma.hostel.findMany({
      select: { id: true, name: true, city: true },
    }),
  ]);

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
        canEdit={canEdit}
        hideFinancials={hideFinancials}
      />
    </div>
  );
}
