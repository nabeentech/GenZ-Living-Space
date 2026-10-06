import React from "react";
import prisma from "@/lib/prisma";
import CheckInDeskClient from "./CheckInDeskClient";

export const dynamic = "force-dynamic";

export default async function CheckInPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Today's Expected Check-ins
  const expectedCheckIns = await prisma.booking.findMany({
    where: {
      bookingStatus: "CONFIRMED",
    },
    include: {
      hostel: true,
      room: { include: { roomType: true } },
      bed: true,
    },
    orderBy: { checkInDate: "asc" },
  });

  // Current Checked-In Guests (Eligible for Check-out)
  const currentResidents = await prisma.booking.findMany({
    where: {
      bookingStatus: "CHECKED_IN",
    },
    include: {
      hostel: true,
      room: { include: { roomType: true } },
      bed: true,
      additionalCharges: true,
    },
    orderBy: { checkOutDate: "asc" },
  });

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
      />
    </div>
  );
}
