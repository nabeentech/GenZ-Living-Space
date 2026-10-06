import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import { generateBookingQRCode } from "@/lib/qr";
import { generateUniqueInvoiceNumber } from "@/lib/invoice";
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

    // Auto find or create customer
    const emailToUse = guestEmail?.trim()?.toLowerCase() || `walkin_${Date.now()}@genzlivingspace.local`;
    let customer = await prisma.user.findUnique({
      where: { email: emailToUse },
    });

    if (!customer) {
      customer = await prisma.user.create({
        data: {
          name: guestName,
          email: emailToUse,
          phone: guestPhone,
          gender: guestGender,
          dateOfBirth: guestDateOfBirth ? new Date(guestDateOfBirth) : null,
          govtIdNumber: guestGovtId,
          passwordHash: "$2a$10$dummyWalkInPassGzHostel2026",
          role: "CUSTOMER",
        },
      });
    }

    const bookingReference = `GZ-W${Math.floor(10000 + Math.random() * 90000)}`;
    const invoiceNumber = await generateUniqueInvoiceNumber();

    const bookingStatus = autoCheckIn ? "CHECKED_IN" : "CONFIRMED";
    const bedStatus = autoCheckIn ? "OCCUPIED" : "RESERVED";
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
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
          baseAmount: Number(totalAmount),
          taxAmount: Math.round(Number(totalAmount) * 0.12),
          serviceFee: 0,
          discountAmount: 0,
          totalAmount: Number(totalAmount),
          paidAmount: Number(totalAmount),
          balanceAmount: 0,
          bookingStatus,
          paymentStatus: "PAID",
          guestName,
          guestEmail: emailToUse,
          guestPhone,
          guestGender,
          guestGovtId,
          checkInTime: autoCheckIn ? now : null,
          checkedInBy: autoCheckIn ? user.name : null,
        },
      });

      // 2. Generate QR Code
      const qrCodeData = await generateBookingQRCode(bookingReference, b.id);
      await tx.booking.update({
        where: { id: b.id },
        data: { qrCodeData },
      });

      // 3. Mark Bed
      await tx.bed.update({
        where: { id: bedId },
        data: {
          status: bedStatus,
          currentOccupantId: customer.id,
        },
      });

      // 4. Record Payment
      await tx.payment.create({
        data: {
          bookingId: b.id,
          customerId: customer.id,
          amount: Number(totalAmount),
          currency: "INR",
          gateway: paymentMethod.toUpperCase(),
          gatewayPaymentId: `walkin_pay_${Date.now()}`,
          status: "CAPTURED",
          paymentMethod,
        },
      });

      // 5. Generate Invoice
      await tx.invoice.create({
        data: {
          invoiceNumber,
          bookingId: b.id,
          customerId: customer.id,
          hostelId,
          issueDate: now,
          dueDate: now,
          baseAmount: Number(totalAmount),
          taxAmount: Math.round(Number(totalAmount) * 0.12),
          totalAmount: Number(totalAmount),
          paidAmount: Number(totalAmount),
          status: "PAID",
        },
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
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create walk-in booking" },
      { status: 500 }
    );
  }
}
