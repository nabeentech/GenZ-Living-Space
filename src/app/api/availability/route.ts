import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { releaseExpiredBookingHolds } from "@/lib/booking-cleanup";
import { isLongStay } from "@/lib/booking-policy";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await releaseExpiredBookingHolds();
    const { searchParams } = new URL(req.url);
    const hostelId = searchParams.get("hostelId");
    const roomTypeId = searchParams.get("roomTypeId");
    const checkInStr = searchParams.get("checkIn");
    const checkOutStr = searchParams.get("checkOut");

    if (!hostelId || !checkInStr || !checkOutStr) {
      return NextResponse.json(
        { success: false, message: "hostelId, checkIn, and checkOut are required" },
        { status: 400 }
      );
    }

    const checkIn = new Date(checkInStr);
    const checkOut = new Date(checkOutStr);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime()) || checkOut <= checkIn) {
      return NextResponse.json(
        { success: false, message: "Invalid checkIn or checkOut dates" },
        { status: 400 }
      );
    }

    const now = new Date();

    // 1. Find all rooms matching hostel (and optional roomType)
    const roomWhere: any = {
      hostelId,
      active: true,
      status: "ACTIVE",
    };
    if (roomTypeId) {
      roomWhere.roomTypeId = roomTypeId;
    }

    const rooms = await prisma.room.findMany({
      where: roomWhere,
      include: {
        roomType: true,
        beds: {
          where: {
            active: true,
            status: { notIn: ["MAINTENANCE", "BLOCKED"] },
          },
        },
      },
    });

    // 2. Query all conflicting bookings for these beds in the date range
    // Overlapping condition: (b.checkInDate < checkOut) AND (b.checkOutDate > checkIn)
    // AND bookingStatus in ['CONFIRMED', 'CHECKED_IN'] OR (bookingStatus = 'PAYMENT_PENDING' AND holdExpiresAt > now)
    const conflictingBookings = await prisma.booking.findMany({
      where: {
        hostelId,
        checkInDate: { lt: checkOut },
        checkOutDate: { gt: checkIn },
        OR: [
          { bookingStatus: { in: ["CONFIRMED", "CHECKED_IN"] } },
          {
            bookingStatus: "PAYMENT_PENDING",
            holdExpiresAt: { gt: now },
          },
        ],
      },
      select: {
        bedId: true,
        bookingStatus: true,
        holdExpiresAt: true,
      },
    });

    // Mark unavailable only beds with date-overlapping bookings
    // (conflictingBookings already filters by date, so long-stay beds are only marked
    // unavailable if they actually overlap with the requested check-in/check-out dates)
    const unavailableBedIds = new Set(conflictingBookings.map((b) => b.bedId));

    // 3. Assemble availability matrix
    const availableRooms = rooms.map((room) => {
      const bedsWithStatus = room.beds.map((bed) => {
        const isBooked = unavailableBedIds.has(bed.id);
        return {
          id: bed.id,
          bedNumber: bed.bedNumber,
          tier: bed.tier,
          isAvailable: !isBooked,
          status: isBooked ? "RESERVED" : bed.status,
        };
      });

      const totalAvailableBeds = bedsWithStatus.filter((b) => b.isAvailable).length;

      return {
        id: room.id,
        roomNumber: room.roomNumber,
        floor: room.floor,
        building: room.building,
        capacity: room.capacity,
        genderCategory: room.genderCategory,
        isAC: room.isAC,
        roomType: room.roomType,
        beds: bedsWithStatus,
        totalAvailableBeds,
        hasAvailability: totalAvailableBeds > 0,
      };
    });

    const totalAvailableAcrossHostel = availableRooms.reduce(
      (sum, r) => sum + r.totalAvailableBeds,
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        hostelId,
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        totalAvailableBeds: totalAvailableAcrossHostel,
        rooms: availableRooms,
      },
    });
  } catch (error: any) {
    console.error("Availability query error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to query availability" },
      { status: 500 }
    );
  }
}
