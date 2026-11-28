import React from "react";
import { redirect } from "next/navigation";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateBookingQRCode } from "@/lib/qr";
import { ACTIVE_THEATER_STATUSES, getIndiaNowDateKey } from "@/lib/home-theater";
import CustomerDashboardClient from "./CustomerDashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (user.role !== "CUSTOMER") {
    const adminHome: Record<string, string> = {
      SUPER_ADMIN: "/admin",
      PROPERTY_MANAGER: "/admin/manager",
      SUPERVISOR: "/admin",
      RECEPTIONIST: "/admin/receptionist",
      FINANCE: "/admin",
      HOUSEKEEPING: "/admin",
      SUPPORT_STAFF: "/admin",
    };
    redirect(adminHome[user.role] || "/admin");
  }

  // Fetch customer's bookings
  const bookings = await prisma.booking.findMany({
    where: { customerId: user.id },
    include: {
      hostel: true,
      room: { include: { roomType: true } },
      bed: true,
      payments: true,
      invoices: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const bookingsWithQr = await Promise.all(
    bookings.map(async (booking) => ({
      ...booking,
      qrCodeData: booking.qrCodeData?.startsWith("data:image/")
        ? booking.qrCodeData
        : await generateBookingQRCode(booking.bookingReference, booking.id),
    }))
  );

  // Fetch customer's support tickets
  const tickets = await prisma.supportTicket.findMany({
    where: { customerId: user.id },
    include: { hostel: true },
    orderBy: { createdAt: "desc" },
  });

  // Fetch the properties for the support ticket dropdown
  const hostels = await prisma.hostel.findMany({
    select: { id: true, name: true, city: true },
  });

  const todayKey = getIndiaNowDateKey();
  const [theaterDayRows, myTheaterRows] = await Promise.all([
    prisma.homeTheaterBooking.findMany({
      where: {
        slotDateKey: todayKey,
        status: { in: ACTIVE_THEATER_STATUSES },
      },
      select: {
        id: true,
        slotDateKey: true,
        slotKey: true,
        status: true,
        userId: true,
        title: true,
      },
    }),
    prisma.homeTheaterBooking.findMany({
      where: { userId: user.id },
      orderBy: [{ slotDateKey: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const initialTheaterDaySlots = theaterDayRows.map((row) => ({
    id: row.id,
    slotDateKey: row.slotDateKey,
    slotKey: row.slotKey,
    status: row.status,
    isMine: row.userId === user.id,
    title: row.userId === user.id || row.status === "BLOCKED" ? row.title : null,
  }));

  const initialMyTheaterBookings = myTheaterRows.map((row) => ({
    id: row.id,
    bookingCode: row.bookingCode,
    slotDateKey: row.slotDateKey,
    slotKey: row.slotKey,
    title: row.title,
    guestCount: row.guestCount,
    notes: row.notes,
    status: row.status,
    roomBedLabel: row.roomBedLabel,
    bookedByRole: row.bookedByRole,
    createdAt: row.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 py-10 lg:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <CustomerDashboardClient
            user={user}
            initialBookings={bookingsWithQr}
            initialTickets={tickets}
            hostels={hostels}
            initialTheaterDate={todayKey}
            initialTheaterDaySlots={initialTheaterDaySlots}
            initialMyTheaterBookings={initialMyTheaterBookings}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
