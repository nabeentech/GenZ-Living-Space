import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { calculateBookingPrice } from "@/lib/pricing";
import { releaseExpiredBookingHolds } from "@/lib/booking-cleanup";
import { isLongStay } from "@/lib/booking-policy";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await releaseExpiredBookingHolds();
    const body = await req.json();
    const {
      hostelId,
      roomId,
      bedId,
      checkInDate,
      checkOutDate,
      guestName,
      guestEmail,
      guestPhone,
      guestGender,
      guestGovtId,
      couponCode,
      specialRequests,
    } = body;

    if (!hostelId || !roomId || !bedId || !checkInDate || !checkOutDate) {
      return NextResponse.json(
        { success: false, message: "Missing required booking fields" },
        { status: 400 }
      );
    }

    if (!guestName || !guestEmail || !guestPhone) {
      return NextResponse.json(
        { success: false, message: "Guest contact details are required" },
        { status: 400 }
      );
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime()) || checkOut <= checkIn) {
      return NextResponse.json(
        { success: false, message: "Invalid check-in or check-out date range" },
        { status: 400 }
      );
    }

    // Get current user or create guest user
    let user = await getSessionUser();
    let customerId = user?.id;

    if (!customerId) {
      const normalizedEmail = guestEmail.toLowerCase().trim();
      let existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!existingUser) {
        // Auto-provision customer account with default temporary pass
        existingUser = await prisma.user.create({
          data: {
            email: normalizedEmail,
            name: guestName,
            phone: guestPhone,
            gender: guestGender,
            passwordHash: "$2a$10$dummyHashGzHostel2026AutoCreatedPass",
            role: "CUSTOMER",
          },
        });
      }
      customerId = existingUser.id;
    }

    // Fetch Room and RoomType details for pricing
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { roomType: true, hostel: true },
    });

    if (!room || !room.roomType) {
      return NextResponse.json(
        { success: false, message: "Selected room not found" },
        { status: 404 }
      );
    }

    // Evaluate Coupon if provided
    let couponRecord: any = null;
    if (couponCode) {
      couponRecord = await prisma.coupon.findUnique({
        where: { code: couponCode.trim().toUpperCase() },
      });

      if (!couponRecord || !couponRecord.active) {
        return NextResponse.json(
          { success: false, message: "Invalid or expired coupon code" },
          { status: 400 }
        );
      }

      if (couponRecord.expiryDate < new Date()) {
        return NextResponse.json(
          { success: false, message: "This coupon has expired" },
          { status: 400 }
        );
      }

      if (
        couponRecord.applicableHostelId &&
        couponRecord.applicableHostelId !== hostelId
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Coupon is not applicable for this property",
          },
          { status: 400 }
        );
      }
    }

    // Calculate Central Price
    const pricing = calculateBookingPrice({
      checkInDate: checkIn,
      checkOutDate: checkOut,
      basePrice: room.roomType.basePrice || 999,
      weeklyDiscountPct: room.roomType.weeklyDiscountPct,
      monthlyPrice: room.roomType.monthlyPrice || 21999,
      securityDeposit: room.roomType.securityDeposit,
      coupon: couponRecord,
    });

    const now = new Date();
    // 15-minute temporary reservation hold lock
    const holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const bookingReference = `GZ-${Math.floor(100000 + Math.random() * 900000)}`;

    // Atomic Transaction: Ensure no double-booking race conditions!
    const result = await prisma.$transaction(async (tx) => {
      // 1. Re-verify bed availability inside transaction
      const conflicting = await tx.booking.findFirst({
        where: {
          bedId,
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
      });

      if (conflicting) {
        throw new Error("This bed has just been reserved by another guest. Please select another bed.");
      }

      const activeLongStay = await tx.booking.findMany({
        where: {
          bedId,
          OR: [
            { bookingStatus: { in: ["CONFIRMED", "CHECKED_IN"] } },
            { bookingStatus: "PAYMENT_PENDING", holdExpiresAt: { gt: now } },
          ],
        },
        select: { checkInDate: true, checkOutDate: true },
      });

      if (activeLongStay.some((stay) => isLongStay(stay.checkInDate, stay.checkOutDate))) {
        throw new Error("This bed is reserved for a long-term stay and cannot accept another booking until an admin releases it.");
      }

      // 2. Create the Booking with PAYMENT_PENDING status & 15m hold
      const booking = await tx.booking.create({
        data: {
          bookingReference,
          customerId,
          hostelId,
          roomId,
          bedId,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          stayType: pricing.stayType,
          guestsCount: 1,
          baseAmount: pricing.baseAmount,
          taxAmount: pricing.taxAmount,
          serviceFee: pricing.serviceFee,
          securityDeposit: pricing.securityDeposit,
          discountAmount: pricing.discountAmount,
          couponCode: pricing.couponCode,
          totalAmount: pricing.totalAmount,
          paidAmount: 0,
          balanceAmount: pricing.totalAmount,
          bookingStatus: "PAYMENT_PENDING",
          paymentStatus: "PENDING",
          guestName,
          guestEmail,
          guestPhone,
          guestGender,
          guestGovtId,
          specialRequests,
          holdExpiresAt,
        },
        include: {
          hostel: true,
          room: { include: { roomType: true } },
          bed: true,
        },
      });

      // Update coupon usage count if applied
      if (couponRecord) {
        await tx.coupon.update({
          where: { id: couponRecord.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      return booking;
    });

    return NextResponse.json({
      success: true,
      message: "Temporary reservation created. Please complete payment within 15 minutes.",
      data: {
        booking: result,
        pricing,
        holdExpiresAt: holdExpiresAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Booking creation error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create booking" },
      { status: 400 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (user.role === "CUSTOMER") {
      where.customerId = user.id;
    }
    if (status) {
      where.bookingStatus = status;
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        hostel: true,
        room: { include: { roomType: true } },
        bed: true,
        payments: true,
        invoices: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: bookings });
  } catch (error: any) {
    console.error("Bookings query error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to query bookings" },
      { status: 500 }
    );
  }
}
