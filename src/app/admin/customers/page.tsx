import { getSessionUser } from "@/lib/auth";
import { canAccessModule, canUserEdit, getFirstAllowedAdminRoute } from "@/lib/permissions";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { CustomerDirectoryClient } from "./CustomerDirectoryClient";

export const metadata = {
  title: "Customers Directory - GenZ Hostels OS",
};

export default async function CustomersPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser || !canAccessModule(sessionUser, "customers")) {
    redirect(getFirstAllowedAdminRoute(sessionUser));
  }

  const canEdit = canUserEdit(sessionUser);

  // Fetch customers and rooms in parallel
  const [customers, rooms] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "CUSTOMER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        gender: true,
        avatarUrl: true,
        dateOfBirth: true,
        address: true,
        emergencyContact: true,
        govtIdType: true,
        govtIdNumber: true,
        hasVehicle: true,
        vehicleNumber: true,
        googleId: true,
        role: true,
        active: true,
        createdAt: true,
        bookings: {
          select: {
            id: true,
            bookingReference: true,
            bookingStatus: true,
            stayType: true,
            checkInDate: true,
            checkOutDate: true,
            securityDeposit: true,
            paidSecurityDeposit: true,
            serviceFee: true,
            paidMaintenanceFee: true,
            totalAmount: true,
            paidAmount: true,
            balanceAmount: true,
            hostel: { select: { id: true, name: true, city: true } },
            room: { select: { id: true, roomNumber: true, floor: true } },
            bed: { select: { id: true, bedNumber: true } },
          },
          orderBy: {
            checkInDate: "desc",
          },
          take: 5, // Get last 5 bookings
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.room.findMany({
      where: { active: true },
      select: {
        id: true,
        roomNumber: true,
        floor: true,
        hostelId: true,
      },
      orderBy: [{ floor: "asc" }, { roomNumber: "asc" }],
    }),
  ]);

  return (
    <main className="p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Customers Directory</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage and view all registered guests in the system
          </p>
        </div>
      </div>

      <CustomerDirectoryClient customers={customers} rooms={rooms} canEdit={canEdit} />
    </main>
  );
}
