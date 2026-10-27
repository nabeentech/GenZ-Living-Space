import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import { addUtcCalendarDays, calculateBookingPrice, getRoomTypePriceRates } from "@/lib/pricing";
import { releaseExpiredBookingHolds } from "@/lib/booking-cleanup";
import { isLongStay } from "@/lib/booking-policy";
import { generateBookingQRCode } from "@/lib/qr";
import { createInvoiceWithRetry } from "@/lib/invoice";

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
      stayType: requestedStayType,
      guestName,
      guestEmail,
      guestPhone,
      guestGender,
      guestGovtId,
      govtIdType,
      couponCode,
      specialRequests,
    } = body;

    if (!hostelId || !roomId || !bedId || !checkInDate || (requestedStayType !== "MONTHLY" && !checkOutDate) || !["DAILY", "MONTHLY"].includes(requestedStayType)) {
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
    const openEndedMonthly = requestedStayType === "MONTHLY";
    const checkOut = openEndedMonthly ? addUtcCalendarDays(checkIn, 30) : new Date(checkOutDate);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime()) || checkOut <= checkIn) {
      return NextResponse.json(
        { success: false, message: "Invalid check-in or check-out date range" },
        { status: 400 }
      );
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please sign in or create an account before booking." },
        { status: 401 }
      );
    }
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (checkIn < today) {
      return NextResponse.json(
        { success: false, message: "Check-in date cannot be in the past." },
        { status: 400 }
      );
    }
    if (user.role !== "CUSTOMER") {
      return NextResponse.json(
        { success: false, message: "A customer account is required to make a booking." },
        { status: 403 }
      );
    }
    const customerId = user.id;

    // Prevent automated booking hoarding by a single account
    const activeUnpaidBookings = await prisma.booking.count({
      where: {
        customerId: user.id,
        paymentStatus: "PENDING",
        bookingStatus: { in: ["CONFIRMED", "PAYMENT_PENDING"] },
      },
    });

    if (activeUnpaidBookings >= 3) {
      return NextResponse.json(
        {
          success: false,
          message: "You have 3 active reservations awaiting payment. Please complete payment or cancel an existing booking before reserving another bed.",
        },
        { status: 429 }
      );
    }

    // Fetch Room and RoomType details for pricing
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { roomType: true, hostel: true },
    });

    if (!room || !room.roomType || room.hostelId !== hostelId || !room.active || room.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, message: "Selected room not found" },
        { status: 404 }
      );
    }

    const bed = await prisma.bed.findFirst({
      where: { id: bedId, roomId, hostelId, active: true, status: { notIn: ["MAINTENANCE", "BLOCKED", "CLEANING"] } },
    });
    if (!bed) {
      return NextResponse.json(
        { success: false, message: "Selected bed is unavailable. Please choose another bed." },
        { status: 400 }
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

      if (couponRecord.startDate > new Date() || couponRecord.usedCount >= couponRecord.usageLimit) {
        return NextResponse.json(
          { success: false, message: "This coupon is not currently available." },
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
    const rates = getRoomTypePriceRates(room.roomType, room.isAC);
    const pricing = calculateBookingPrice({
      checkInDate: checkIn,
      checkOutDate: checkOut,
      basePrice: rates.daily,
      rates,
      stayType: requestedStayType,
      weeklyDiscountPct: room.roomType.weeklyDiscountPct,
      monthlyPrice: rates.days30,
      securityDeposit: room.roomType.securityDeposit,
      maintenanceFee: (room.roomType as any).maintenanceFee,
      coupon: couponRecord,
    });

    const now = new Date();
    // Gateway is intentionally inactive until a Razorpay account is configured.
    const holdExpiresAt = null;
    let bookingReference = `GZ-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    for (let i = 0; i < 3; i++) {
      const existing = await prisma.booking.findUnique({ where: { bookingReference } });
      if (!existing) break;
      bookingReference = `GZ-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    }

    // Atomic Transaction: Ensure no double-booking race conditions!
    const result = await prisma.$transaction(async (tx) => {
      // 1. Re-verify bed availability inside transaction
      const conflicting = await tx.booking.findFirst({
        where: {
          bedId,
          AND: [
            { OR: [{ isOpenEnded: true, checkInDate: { lt: checkOut } }, { isOpenEnded: false, checkInDate: { lt: checkOut }, checkOutDate: { gt: checkIn } }] },
            { OR: [
              { bookingStatus: { in: ["CONFIRMED", "CHECKED_IN"] } },
              { bookingStatus: "PAYMENT_PENDING", holdExpiresAt: { gt: now } },
            ] },
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
        select: { checkInDate: true, checkOutDate: true, isOpenEnded: true },
      });

      if (
        activeLongStay.some(
          (stay) =>
            stay.isOpenEnded ||
            (isLongStay(stay.checkInDate, stay.checkOutDate) &&
              stay.checkInDate < checkOut &&
              stay.checkOutDate > checkIn)
        )
      ) {
        throw new Error("This bed is reserved for a long-term stay during the requested dates.");
      }

      const holdDurationMinutes = 15;
      const holdExpiresAt = new Date(Date.now() + holdDurationMinutes * 60 * 1000);

      // Create a pending reservation and allocate the selected bed with a 15-minute hold.
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
          isOpenEnded: openEndedMonthly,
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
          guestName: user.name,
          guestEmail: user.email,
          guestPhone: user.phone || guestPhone,
          guestGender: user.gender || guestGender,
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

      const qrCodeData = await generateBookingQRCode(bookingReference, booking.id);
      await tx.booking.update({ where: { id: booking.id }, data: { qrCodeData } });

      await tx.bed.update({ where: { id: bedId }, data: { status: "RESERVED", currentOccupantId: user.id } });

      if (guestGovtId) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            govtIdType: govtIdType || user.govtIdType || "AADHAAR",
            govtIdNumber: guestGovtId,
          },
        });
      }
      await createInvoiceWithRetry(tx, {
        bookingId: booking.id,
        customerId: user.id,
        hostelId,
        issueDate: now,
        dueDate: now,
        baseAmount: pricing.baseAmount,
        taxAmount: pricing.taxAmount,
        serviceFee: pricing.serviceFee,
        securityDeposit: pricing.securityDeposit,
        discountAmount: pricing.discountAmount,
        totalAmount: pricing.totalAmount,
        paidAmount: 0,
        balanceDue: pricing.totalAmount,
        status: "DUE",
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
      message: "Bed hold secured. Proceeding to payment...",
      data: {
        booking: result,
        pricing,
        holdExpiresAt: result.holdExpiresAt,
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
    if (user.role !== ROLES.CUSTOMER && !hasPermission(user.role, [ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER, ROLES.RECEPTIONIST, ROLES.FINANCE])) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
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
