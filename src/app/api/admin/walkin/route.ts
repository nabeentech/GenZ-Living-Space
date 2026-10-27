import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES, hashPassword } from "@/lib/auth";
import { generateBookingQRCode } from "@/lib/qr";
import { createInvoiceWithRetry } from "@/lib/invoice";
import { logAuditAction } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (
      !user ||
      !hasPermission(user.role, [
        ROLES.SUPER_ADMIN,
        ROLES.PROPERTY_MANAGER,
        ROLES.RECEPTIONIST,
      ])
    ) {
      return NextResponse.json(
        { success: false, message: "Unauthorized staff role" },
        { status: 403 }
      );
    }

    const {
      guestName,
      guestEmail,
      guestPhone,
      guestGender = "MALE",
      guestDateOfBirth,
      guestGovtId,
      hostelId,
      roomId,
      bedId,
      checkInDate,
      checkOutDate,
      totalAmount,
      paymentMethod = "cash",
      autoCheckIn = true,
    } = await req.json();

    if (!guestName || !guestPhone || !hostelId || !roomId || !bedId) {
      return NextResponse.json(
        { success: false, message: "Missing required walk-in reservation fields" },
        { status: 400 }
      );
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const amount = Number(totalAmount);
    if (!Number.isFinite(checkIn.getTime()) || !Number.isFinite(checkOut.getTime()) || checkOut <= checkIn) {
      return NextResponse.json({ success: false, message: "Enter a valid check-in and check-out date range." }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, message: "Booking amount must be greater than zero." }, { status: 400 });
    }

    const emailToUse = guestEmail?.trim()?.toLowerCase() || `walkin_${Date.now()}@genzlivingspace.local`;

    const bookingReference = `GZ-W${Math.floor(10000 + Math.random() * 90000)}`;


    const now = new Date();
    const isPastStay = checkOut <= now;
    const isFutureStay = checkIn > now;

    // Smart status resolution:
    // Past completed stay -> CHECKED_OUT (records revenue & history, keeps bed free)
    // Currently active stay -> CHECKED_IN & OCCUPIED (locks bed for resident)
    // Future advance stay -> CONFIRMED & RESERVED
    const bookingStatus = isPastStay
      ? "CHECKED_OUT"
      : isFutureStay
      ? "CONFIRMED"
      : autoCheckIn
      ? "CHECKED_IN"
      : "CONFIRMED";

    const bedStatus = isPastStay
      ? "AVAILABLE"
      : bookingStatus === "CHECKED_IN"
      ? "OCCUPIED"
      : "RESERVED";

    const result = await prisma.$transaction(async (tx) => {
      const bed = await tx.bed.findFirst({
        where: {
          id: bedId,
          roomId,
          hostelId,
          active: true,
          room: { active: true, status: "ACTIVE", hostel: { active: true } },
        },
      });
      if (!bed) throw new Error("The selected bed is no longer available.");

      const conflictingBooking = await tx.booking.findFirst({
        where: {
          bedId,
          checkInDate: { lt: checkOut },
          checkOutDate: { gt: checkIn },
          OR: [
            { bookingStatus: { in: ["CONFIRMED", "CHECKED_IN"] } },
            { bookingStatus: "PAYMENT_PENDING", holdExpiresAt: { gt: now } },
          ],
        },
      });
      if (conflictingBooking) {
        throw new Error(
          `The selected bed is already booked during these dates (${conflictingBooking.bookingReference}).`
        );
      }

      let customer = await tx.user.findUnique({ where: { email: emailToUse } });
      if (!customer) {
        const tempPassword = crypto.randomBytes(16).toString("hex");
        const validPasswordHash = await hashPassword(tempPassword);
        customer = await tx.user.create({
          data: {
            name: guestName,
            email: emailToUse,
            phone: guestPhone,
            gender: guestGender,
            dateOfBirth: guestDateOfBirth ? new Date(guestDateOfBirth) : null,
            govtIdNumber: guestGovtId,
            passwordHash: validPasswordHash,
            role: "CUSTOMER",
          },
        });
      }

      // 1. Create Booking
      const b = await tx.booking.create({
        data: {
          bookingReference,
          customerId: customer.id,
          hostelId,
          roomId,
          bedId,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          stayType: "DAILY",
          guestsCount: 1,
          baseAmount: amount,
          taxAmount: 0,
          serviceFee: 0,
          discountAmount: 0,
          totalAmount: amount,
          paidAmount: amount,
          balanceAmount: 0,
          bookingStatus,
          paymentStatus: "PAID",
          guestName,
          guestEmail: emailToUse,
          guestPhone,
          guestGender,
          guestGovtId,
          checkInTime: autoCheckIn ? (checkIn < now ? checkIn : now) : (isPastStay ? checkIn : null),
          checkedInBy: autoCheckIn || isPastStay ? user.name : null,
          checkOutTime: isPastStay ? checkOut : null,
          checkedOutBy: isPastStay ? user.name : null,
        },
      });

      // 2. Generate QR Code
      const qrCodeData = await generateBookingQRCode(bookingReference, b.id);
      await tx.booking.update({
        where: { id: b.id },
        data: { qrCodeData },
      });

      // 3. Mark Bed (only mark occupied/reserved if stay is current or future)
      if (!isPastStay) {
        await tx.bed.update({
          where: { id: bedId },
          data: {
            status: bedStatus,
            currentOccupantId: customer.id,
          },
        });
      }

      // 4. Record Payment
      await tx.payment.create({
        data: {
          bookingId: b.id,
          customerId: customer.id,
          amount,
          currency: "INR",
          gateway: paymentMethod.toUpperCase(),
          gatewayPaymentId: `walkin_pay_${Date.now()}`,
          status: "CAPTURED",
          paymentMethod,
        },
      });

      // 5. Generate Invoice
      await createInvoiceWithRetry(tx, {
        bookingId: b.id,
        customerId: customer.id,
        hostelId,
        issueDate: now,
        dueDate: now,
        baseAmount: amount,
        taxAmount: 0,
        totalAmount: amount,
        paidAmount: amount,
        status: "PAID",
      });

      return b;
    });

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: "WALK_IN_BOOKING_CREATED",
      entity: "Booking",
      entityId: result.id,
      newValue: {
        bookingRef: bookingReference,
        guestName,
        paymentMethod,
        autoCheckIn,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Walk-in booking #${bookingReference} successfully recorded and bed locked!`,
      data: result,
    });
  } catch (error: any) {
    console.error("Walk-in booking creation error:", error);
    const status = error.message?.includes("selected bed") ? 409 : 500;
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create walk-in booking" },
      { status }
    );
  }
}
