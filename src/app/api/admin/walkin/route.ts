import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES, hashPassword } from "@/lib/auth";
import { generateBookingQRCode } from "@/lib/qr";
import { createInvoiceWithRetry } from "@/lib/invoice";
import { logAuditAction } from "@/lib/audit";
import { addUtcCalendarDays, calculateBookingPrice, getRoomTypePriceRates } from "@/lib/pricing";

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
      guestsCount = 1,
      guestDetails,
      guestGovtId,
      hostelId,
      roomId,
      bedId,
      checkInDate,
      checkOutDate,
      stayType = "DAILY",
      customTotalAmount,
      advanceAmount = 0,
      dueDate,
      paymentMethod = "cash",
      autoCheckIn = true,
    } = await req.json();

    if (typeof guestName !== "string" || !guestName.trim() || typeof guestPhone !== "string" || !guestPhone || !hostelId || !roomId || !bedId) {
      return NextResponse.json(
        { success: false, message: "Missing required walk-in reservation fields" },
        { status: 400 }
      );
    }

    const checkIn = new Date(checkInDate);
    const paidAmount = Number(advanceAmount);
    const guestCount = Number(guestsCount);
    if (!["DAILY", "MONTHLY"].includes(stayType)) {
      return NextResponse.json({ success: false, message: "Choose Daily or Monthly for the stay type." }, { status: 400 });
    }
    const validDateOnly = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()) && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
    if (!validDateOnly(checkInDate) || !Number.isFinite(checkIn.getTime())) {
      return NextResponse.json({ success: false, message: "Enter a valid check-in date." }, { status: 400 });
    }
    if (stayType === "DAILY" && !validDateOnly(checkOutDate)) {
      return NextResponse.json({ success: false, message: "Enter a valid check-out date." }, { status: 400 });
    }
    const checkOut = stayType === "MONTHLY"
      ? addUtcCalendarDays(checkIn, 30)
      : new Date(checkOutDate);
    if (!Number.isFinite(checkIn.getTime()) || !Number.isFinite(checkOut.getTime()) || checkOut <= checkIn) {
      return NextResponse.json({ success: false, message: "Enter a valid check-in and check-out date range." }, { status: 400 });
    }
    const selectedRoom = await prisma.room.findFirst({
      where: { id: roomId, hostelId, active: true, status: "ACTIVE", hostel: { active: true } },
      include: { roomType: true },
    });
    if (!selectedRoom) return NextResponse.json({ success: false, message: "Selected room is no longer available." }, { status: 409 });
    const rates = getRoomTypePriceRates(selectedRoom.roomType, selectedRoom.isAC);
    const pricing = calculateBookingPrice({
      checkInDate: checkIn,
      checkOutDate: checkOut,
      basePrice: rates.daily,
      rates,
      weeklyDiscountPct: selectedRoom.roomType.weeklyDiscountPct,
      monthlyPrice: rates.days30,
      securityDeposit: selectedRoom.roomType.securityDeposit,
      maintenanceFee: selectedRoom.roomType.maintenanceFee,
      stayType,
    });
    const customAmount = customTotalAmount === null || customTotalAmount === undefined || customTotalAmount === "" ? null : Number(customTotalAmount);
    const amount = customAmount === null ? pricing.totalAmount : customAmount;
    const minimumCharges = pricing.serviceFee + pricing.securityDeposit;
    const recordedBaseAmount = customAmount === null
      ? pricing.baseAmount
      : amount - pricing.serviceFee - pricing.securityDeposit - pricing.taxAmount;
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, message: "Booking amount must be greater than zero." }, { status: 400 });
    }
    if (amount < minimumCharges) {
      return NextResponse.json({ success: false, message: `Agreed total cannot be lower than the required fees and refundable deposit (₹${minimumCharges.toLocaleString("en-IN")}).` }, { status: 400 });
    }
    if (!Number.isFinite(paidAmount) || paidAmount < 0 || paidAmount > amount) {
      return NextResponse.json({ success: false, message: "Advance paid must be between zero and the booking total." }, { status: 400 });
    }
    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 10) {
      return NextResponse.json({ success: false, message: "Number of guests must be between 1 and 10." }, { status: 400 });
    }
    const normalizedGuestDetails = Array.isArray(guestDetails)
      ? guestDetails
      : [{ name: guestName, phone: guestPhone, email: guestEmail || "", govtId: guestGovtId || "", gender: guestGender, dateOfBirth: guestDateOfBirth || "" }];
    if (normalizedGuestDetails.length !== guestCount) {
      return NextResponse.json({ success: false, message: "Provide details for every guest in the reservation." }, { status: 400 });
    }
    for (let index = 0; index < normalizedGuestDetails.length; index++) {
      const guest = normalizedGuestDetails[index];
      if (!guest || typeof guest.name !== "string" || !guest.name.trim() || guest.name.trim().length > 100) {
        return NextResponse.json({ success: false, message: `Guest ${index + 1}: enter a name up to 100 characters.` }, { status: 400 });
      }
      if (typeof guest.phone !== "string" || !/^\d{10}$/.test(guest.phone)) {
        return NextResponse.json({ success: false, message: `Guest ${index + 1}: enter a valid 10-digit mobile number.` }, { status: 400 });
      }
      if (guest.email && (typeof guest.email !== "string" || guest.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email))) {
        return NextResponse.json({ success: false, message: `Guest ${index + 1}: enter a valid email address.` }, { status: 400 });
      }
      if (guest.gender && !["MALE", "FEMALE", "OTHER"].includes(guest.gender)) {
        return NextResponse.json({ success: false, message: `Guest ${index + 1}: choose a valid gender option.` }, { status: 400 });
      }
      if (guest.govtId && (typeof guest.govtId !== "string" || guest.govtId.length > 100)) {
        return NextResponse.json({ success: false, message: `Guest ${index + 1}: government ID must be 100 characters or fewer.` }, { status: 400 });
      }
      if (guest.dateOfBirth && (typeof guest.dateOfBirth !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(guest.dateOfBirth) || Number.isNaN(new Date(`${guest.dateOfBirth}T12:00:00Z`).getTime()) || new Date(`${guest.dateOfBirth}T12:00:00Z`).toISOString().slice(0, 10) !== guest.dateOfBirth)) {
        return NextResponse.json({ success: false, message: `Guest ${index + 1}: enter a valid date of birth.` }, { status: 400 });
      }
    }
    if (!/^\d{10}$/.test(guestPhone)) {
      return NextResponse.json({ success: false, message: "Primary guest mobile number must contain exactly 10 digits." }, { status: 400 });
    }
    if (normalizedGuestDetails[0].phone !== guestPhone || normalizedGuestDetails[0].name.trim() !== guestName.trim()) {
      return NextResponse.json({ success: false, message: "Primary guest details do not match the booking contact." }, { status: 400 });
    }
    const persistedGuestDetails = normalizedGuestDetails.map((guest: any) => ({
      name: guest.name.trim(),
      phone: guest.phone,
      email: guest.email || "",
      govtId: guest.govtId || "",
      gender: guest.gender || "OTHER",
      dateOfBirth: guest.dateOfBirth || "",
    }));
    const roomGenderRule = selectedRoom.roomType.genderCategory;
    if (["MALE", "FEMALE"].includes(roomGenderRule) && persistedGuestDetails.some((guest) => guest.gender !== roomGenderRule)) {
      return NextResponse.json({ success: false, message: `This room category is reserved for ${roomGenderRule.toLowerCase()} guests. Update guest details or select another category.` }, { status: 400 });
    }
    const balanceAmount = amount - paidAmount;
    const now = new Date();
    const due = balanceAmount > 0 && dueDate ? new Date(`${dueDate}T18:29:59.000Z`) : now;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const validDueDate = typeof dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dueDate) &&
      Number.isFinite(due.getTime()) && due.toISOString().slice(0, 10) === dueDate;
    if (balanceAmount > 0 && (!validDueDate || due < today)) {
      return NextResponse.json({ success: false, message: "Enter a valid due date today or later when a balance remains." }, { status: 400 });
    }

    const emailToUse = guestEmail?.trim()?.toLowerCase() || `walkin_${Date.now()}@genzlivingspace.local`;

    const bookingReference = `GZ-W${Math.floor(10000 + Math.random() * 90000)}`;


    const indiaToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
    const checkInDay = checkIn.toISOString().slice(0, 10);
    const checkOutDay = checkOut.toISOString().slice(0, 10);
    const isPastStay = checkOutDay < indiaToday;
    const isFutureStay = checkInDay > indiaToday;

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
      const bedGuestCapacity = bed.tier === "DOUBLE" ? 2 : 1;
      if (guestCount > bedGuestCapacity) {
        throw Object.assign(new Error(`This ${bed.tier === "DOUBLE" ? "Double" : "single-occupancy"} bed can accommodate up to ${bedGuestCapacity} guest${bedGuestCapacity === 1 ? "" : "s"}.`), { status: 400 });
      }

      const dateConflict = stayType === "MONTHLY"
        ? [{ OR: [{ isOpenEnded: true, checkOutDate: { gt: checkIn } }, { isOpenEnded: false, checkOutDate: { gt: checkIn } }] }]
        : [{ OR: [
            { isOpenEnded: true, checkInDate: { lt: checkOut } },
            { isOpenEnded: false, checkInDate: { lt: checkOut }, checkOutDate: { gt: checkIn } },
          ] }];
      const conflictingBooking = await tx.booking.findFirst({
        where: {
          bedId,
          AND: [
            ...dateConflict,
            { bookingStatus: { in: ["CONFIRMED", "CHECKED_IN", "PAYMENT_PENDING"] } },
          ],
        },
      });
      if (conflictingBooking) {
        throw new Error(
          `The selected bed is already booked during these dates (${conflictingBooking.bookingReference}).`
        );
      }
      if (!isPastStay && bed.status !== "AVAILABLE") {
        throw Object.assign(new Error("The selected bed is not currently available. Refresh the room list and choose another bed."), { status: 409 });
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
          stayType: pricing.stayType,
          isOpenEnded: stayType === "MONTHLY",
          guestsCount: guestCount,
          baseAmount: recordedBaseAmount,
          taxAmount: pricing.taxAmount,
          serviceFee: pricing.serviceFee,
          securityDeposit: pricing.securityDeposit,
          discountAmount: pricing.discountAmount,
          totalAmount: amount,
          paidAmount,
          balanceAmount,
          bookingStatus,
          paymentStatus: balanceAmount === 0 ? "PAID" : paidAmount > 0 ? "PARTIAL" : "PENDING",
          guestName,
          guestEmail: emailToUse,
          guestPhone,
          guestGender,
          guestGovtId,
          guestDetails: JSON.stringify(persistedGuestDetails),
          checkInTime: isPastStay ? checkIn : bookingStatus === "CHECKED_IN" ? (checkInDay < indiaToday ? checkIn : now) : null,
          checkedInBy: bookingStatus === "CHECKED_IN" || isPastStay ? user.name : null,
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
      if (paidAmount > 0) {
        await tx.payment.create({
          data: {
            bookingId: b.id,
            customerId: customer.id,
            amount: paidAmount,
            currency: "INR",
            gateway: paymentMethod.toUpperCase(),
            gatewayPaymentId: `walkin_pay_${Date.now()}`,
            status: "CAPTURED",
            paymentMethod,
          },
        });
      }

      // 5. Generate Invoice
      await createInvoiceWithRetry(tx, {
        bookingId: b.id,
        customerId: customer.id,
        hostelId,
        issueDate: now,
        dueDate: due,
        baseAmount: recordedBaseAmount,
        taxAmount: pricing.taxAmount,
        serviceFee: pricing.serviceFee,
        securityDeposit: pricing.securityDeposit,
        discountAmount: pricing.discountAmount,
        totalAmount: amount,
        paidAmount,
        balanceDue: balanceAmount,
        status: balanceAmount === 0 ? "PAID" : paidAmount > 0 ? "PARTIAL" : "DUE",
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
        paymentMethod: paidAmount > 0 ? paymentMethod : null,
        paidAmount,
        balanceAmount,
        dueDate: balanceAmount > 0 ? due.toISOString() : null,
        autoCheckIn,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Walk-in booking #${bookingReference} recorded. ₹${paidAmount.toLocaleString()} received; ₹${balanceAmount.toLocaleString()} balance due${balanceAmount > 0 ? ` by ${due.toLocaleDateString("en-IN")}` : ""}.`,
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
