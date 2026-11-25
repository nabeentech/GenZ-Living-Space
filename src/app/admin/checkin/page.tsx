import React from "react";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { canAccessModule, canUserEdit, getFirstAllowedAdminRoute } from "@/lib/permissions";
import CheckInDeskClient from "./CheckInDeskClient";

export const dynamic = "force-dynamic";

export default async function CheckInPage() {
  const user = await getSessionUser();
  if (!user || !canAccessModule(user, "checkin")) {
    redirect(getFirstAllowedAdminRoute(user));
  }
  const canEdit = canUserEdit(user);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Fetch expected check-ins and current residents in parallel with lean select (excluding qrCodeData/image blobs)
  const [expectedCheckIns, currentResidents] = await Promise.all([
    prisma.booking.findMany({
      where: {
        bookingStatus: "CONFIRMED",
      },
      select: {
        id: true,
        bookingReference: true,
        customerId: true,
        guestName: true,
        guestEmail: true,
        guestPhone: true,
        guestGovtId: true,
        checkInDate: true,
        checkOutDate: true,
        stayType: true,
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
        securityDeposit: true,
        paidSecurityDeposit: true,
        bookingStatus: true,
        paymentStatus: true,
        hostel: { select: { id: true, name: true } },
        room: {
          select: {
            id: true,
            roomNumber: true,
            floor: true,
            roomType: { select: { id: true, name: true } },
          },
        },
        bed: { select: { id: true, bedNumber: true } },
        invoices: {
          orderBy: { dueDate: "asc" },
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
      },
      orderBy: { checkInDate: "asc" },
    }),
    prisma.booking.findMany({
      where: {
        bookingStatus: "CHECKED_IN",
      },
      select: {
        id: true,
        bookingReference: true,
        customerId: true,
        guestName: true,
        guestEmail: true,
        guestPhone: true,
        guestGovtId: true,
        checkInDate: true,
        checkOutDate: true,
        checkInTime: true,
        checkedInBy: true,
        stayType: true,
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
        securityDeposit: true,
        paidSecurityDeposit: true,
        bookingStatus: true,
        paymentStatus: true,
        hostel: { select: { id: true, name: true } },
        room: {
          select: {
            id: true,
            roomNumber: true,
            floor: true,
            roomType: { select: { id: true, name: true } },
          },
        },
        bed: { select: { id: true, bedNumber: true } },
        additionalCharges: {
          select: {
            id: true,
            category: true,
            description: true,
            amount: true,
            status: true,
          },
        },
        invoices: {
          orderBy: { dueDate: "asc" },
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
      },
      orderBy: { checkOutDate: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">
          Reception Desk Operations
        </span>
        <h1 className="text-3xl font-black text-white">QR Check-In & Check-Out Desk</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Scan resident QR code pass or enter booking reference to process check-in, verify government identity, and record checkout charges.
        </p>
      </div>

      <CheckInDeskClient
        expectedCheckIns={expectedCheckIns}
        currentResidents={currentResidents}
        canEdit={canEdit}
      />
    </div>
  );
}
