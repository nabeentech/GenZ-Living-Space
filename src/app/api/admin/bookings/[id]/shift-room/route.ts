import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import { canUserEdit } from "@/lib/permissions";
import { logAuditAction } from "@/lib/audit";
import { getRoomTypePriceRates } from "@/lib/pricing";
import { generateUniqueInvoiceNumber } from "@/lib/invoice";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (
      !user ||
      !hasPermission(user.role, [
        ROLES.SUPER_ADMIN,
        ROLES.PROPERTY_MANAGER,
        ROLES.RECEPTIONIST,
        ROLES.FINANCE,
      ])
    ) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const { id: bookingId } = await params;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        hostel: true,
        room: { include: { roomType: true } },
        bed: true,
        customer: true,
        invoices: { where: { status: { not: "CANCELLED" } }, orderBy: { dueDate: "asc" } },
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
    }

    if (!["CONFIRMED", "CHECKED_IN"].includes(booking.bookingStatus)) {
      return NextResponse.json(
        { success: false, message: `Cannot shift room for booking in status "${booking.bookingStatus}"` },
        { status: 400 }
      );
    }

    // Fetch all active rooms and beds in this hostel
    const rooms = await prisma.room.findMany({
      where: {
        hostelId: booking.hostelId,
        active: true,
        status: { notIn: ["MAINTENANCE", "BLOCKED"] },
      },
      include: {
        roomType: true,
        beds: {
          where: { active: true },
          orderBy: { bedNumber: "asc" },
        },
      },
      orderBy: [{ floor: "asc" }, { roomNumber: "asc" }],
    });

    const roomTypes = await prisma.roomType.findMany({
      where: { active: true },
      orderBy: [{ totalBeds: "asc" }, { slug: "asc" }],
    });

    const oldRates = getRoomTypePriceRates(booking.room.roomType, booking.room.isAC);

    return NextResponse.json({
      success: true,
      data: {
        booking,
        currentRates: oldRates,
        rooms,
        roomTypes,
      },
    });
  } catch (error: any) {
    console.error("Error fetching shift-room options:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load shift room options" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (
      !user ||
      !hasPermission(user.role, [
        ROLES.SUPER_ADMIN,
        ROLES.PROPERTY_MANAGER,
        ROLES.RECEPTIONIST,
        ROLES.FINANCE,
      ])
    ) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    if (!canUserEdit(user)) {
      return NextResponse.json(
        { success: false, message: "You have view-only access and cannot shift rooms." },
        { status: 403 }
      );
    }

    const { id: bookingId } = await params;
    const body = await req.json();
    const {
      targetBedId,
      adjustmentAmount = 0,
      depositAdjustment = 0,
      settlementType = "NO_ADJUSTMENT",
      paymentMethod = "CASH",
      notes = "",
    } = body;

    if (!targetBedId) {
      return NextResponse.json({ success: false, message: "Target bed is required" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        hostel: true,
        room: { include: { roomType: true } },
        bed: true,
        customer: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
    }

    if (!["CONFIRMED", "CHECKED_IN"].includes(booking.bookingStatus)) {
      return NextResponse.json(
        { success: false, message: `Cannot shift room for booking in status "${booking.bookingStatus}"` },
        { status: 400 }
      );
    }

    if (booking.bedId === targetBedId) {
      return NextResponse.json(
        { success: false, message: "Resident is already assigned to this bed." },
        { status: 400 }
      );
    }

    const targetBed = await prisma.bed.findUnique({
      where: { id: targetBedId },
      include: {
        room: { include: { roomType: true } },
      },
    });

    if (!targetBed || !targetBed.active) {
      return NextResponse.json({ success: false, message: "Selected bed not found or inactive." }, { status: 404 });
    }

    if (targetBed.status !== "AVAILABLE") {
      return NextResponse.json(
        { success: false, message: `Selected bed ${targetBed.bedNumber} is not available (Status: ${targetBed.status}).` },
        { status: 409 }
      );
    }

    if (targetBed.hostelId !== booking.hostelId) {
      return NextResponse.json(
        { success: false, message: "Cannot shift resident to a different hostel property." },
        { status: 400 }
      );
    }

    const parsedAdjustment = Math.round(Number(adjustmentAmount) || 0);
    const parsedDepositAdj = Math.round(Number(depositAdjustment) || 0);

    // Execute atomic shift transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Re-verify target bed availability under transaction lock
      const lockedTarget = await tx.bed.findUnique({
        where: { id: targetBedId },
        include: { room: { include: { roomType: true } } },
      });
      if (!lockedTarget || lockedTarget.status !== "AVAILABLE") {
        throw new Error(`Bed ${lockedTarget?.bedNumber || "selected"} was just occupied. Please choose another bed.`);
      }

      // 2. Release old bed -> set status to CLEANING
      await tx.bed.update({
        where: { id: booking.bedId },
        data: {
          status: "CLEANING",
          currentOccupantId: null,
        },
      });

      // 3. Create Housekeeping task to sanitize the old bed
      await tx.housekeepingTask.create({
        data: {
          hostelId: booking.hostelId,
          roomId: booking.roomId,
          bedId: booking.bedId,
          taskType: "CLEANING",
          status: "DIRTY",
          notes: `Room shift: Guest ${booking.guestName} moved to Room ${lockedTarget.room.roomNumber} (${lockedTarget.bedNumber}). Sanitize and prepare bed.`,
        },
      });

      // 4. Assign new bed -> set status to OCCUPIED
      await tx.bed.update({
        where: { id: targetBedId },
        data: {
          status: "OCCUPIED",
          currentOccupantId: booking.customerId,
        },
      });

      // 5. Calculate new financial totals
      let newTotalAmount = booking.totalAmount;
      let newPaidAmount = booking.paidAmount;
      let newBalanceAmount = booking.balanceAmount;
      let newSecurityDeposit = booking.securityDeposit + parsedDepositAdj;

      if (settlementType === "COLLECT_NOW" && parsedAdjustment > 0) {
        newTotalAmount += parsedAdjustment;
        newPaidAmount += parsedAdjustment;
        // Balance remains unchanged since extra was collected on spot

        // Create Payment record
        await tx.payment.create({
          data: {
            bookingId: booking.id,
            customerId: booking.customerId,
            amount: parsedAdjustment,
            currency: "INR",
            gateway: (paymentMethod || "CASH").toUpperCase(),
            status: "CAPTURED",
            paymentMethod: (paymentMethod || "cash").toLowerCase(),
            metadata: JSON.stringify({
              reason: "ROOM_SHIFT_UPGRADE",
              fromRoom: booking.room.roomNumber,
              fromBed: booking.bed.bedNumber,
              toRoom: lockedTarget.room.roomNumber,
              toBed: lockedTarget.bedNumber,
            }),
          },
        });

        // Create Paid Tax Invoice
        const invoiceNumber = await generateUniqueInvoiceNumber(tx);
        await tx.invoice.create({
          data: {
            invoiceNumber,
            bookingId: booking.id,
            customerId: booking.customerId,
            hostelId: booking.hostelId,
            dueDate: new Date(),
            baseAmount: parsedAdjustment,
            taxAmount: 0,
            serviceFee: 0,
            securityDeposit: parsedDepositAdj,
            totalAmount: parsedAdjustment,
            paidAmount: parsedAdjustment,
            balanceDue: 0,
            status: "PAID",
          },
        });
      } else if (settlementType === "ADD_TO_BALANCE" && parsedAdjustment > 0) {
        newTotalAmount += parsedAdjustment;
        newBalanceAmount += parsedAdjustment;

        // Create Due Invoice
        const invoiceNumber = await generateUniqueInvoiceNumber(tx);
        await tx.invoice.create({
          data: {
            invoiceNumber,
            bookingId: booking.id,
            customerId: booking.customerId,
            hostelId: booking.hostelId,
            dueDate: booking.checkOutDate,
            baseAmount: parsedAdjustment,
            taxAmount: 0,
            serviceFee: 0,
            securityDeposit: parsedDepositAdj,
            totalAmount: parsedAdjustment,
            paidAmount: 0,
            balanceDue: parsedAdjustment,
            status: "DUE",
          },
        });
      } else if (settlementType === "DEDUCT_BALANCE" && parsedAdjustment < 0) {
        const credit = Math.abs(parsedAdjustment);
        newBalanceAmount = Math.max(0, newBalanceAmount - credit);
        newTotalAmount = Math.max(0, newTotalAmount - credit);
      } else if (settlementType === "REFUND_NOW" && parsedAdjustment < 0) {
        const refundAmt = Math.abs(parsedAdjustment);
        newTotalAmount = Math.max(0, newTotalAmount - refundAmt);
        newPaidAmount = Math.max(0, newPaidAmount - refundAmt);

        // Record a Refund entry
        await tx.refund.create({
          data: {
            bookingId: booking.id,
            amount: refundAmt,
            reason: `Room shift downgrade to Room ${lockedTarget.room.roomNumber} (${lockedTarget.bedNumber})`,
            status: "PROCESSED",
            processedBy: user.name || user.email,
          },
        });
      }
      // WAIVE, CREDIT_NEXT_RENT, or NO_ADJUSTMENT: totals preserved or handled on next cycle

      // 6. Build audit log note
      const dateStr = new Date().toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const shiftNote = `[${dateStr}] Room Shift: Moved from Room ${booking.room.roomNumber} (${booking.bed.bedNumber}) to Room ${lockedTarget.room.roomNumber} (${lockedTarget.bedNumber}) by ${user.name || user.email}. Settlement: ${settlementType} (${parsedAdjustment >= 0 ? `+₹${parsedAdjustment}` : `-₹${Math.abs(parsedAdjustment)}`}). ${notes ? `Note: ${notes}` : ""}`;
      const updatedNotes = booking.internalNotes ? `${booking.internalNotes}\n${shiftNote}` : shiftNote;

      // 7. Update Booking record
      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          roomId: lockedTarget.roomId,
          bedId: lockedTarget.id,
          totalAmount: newTotalAmount,
          paidAmount: newPaidAmount,
          balanceAmount: newBalanceAmount,
          securityDeposit: newSecurityDeposit,
          internalNotes: updatedNotes,
        },
        include: {
          hostel: true,
          room: { include: { roomType: true } },
          bed: true,
          customer: true,
        },
      });

      return {
        updatedBooking,
        fromRoomNumber: booking.room.roomNumber,
        fromBedNumber: booking.bed.bedNumber,
        toRoomNumber: lockedTarget.room.roomNumber,
        toBedNumber: lockedTarget.bedNumber,
        adjustment: parsedAdjustment,
      };
    });

    // 8. Log Audit Action
    await logAuditAction({
      userId: user.id,
      userName: user.name || user.email,
      action: "ROOM_SHIFT",
      entity: "Booking",
      entityId: booking.id,
      previousValue: {
        roomId: booking.roomId,
        roomNumber: booking.room.roomNumber,
        bedId: booking.bedId,
        bedNumber: booking.bed.bedNumber,
        totalAmount: booking.totalAmount,
        balanceAmount: booking.balanceAmount,
      },
      newValue: {
        roomId: result.updatedBooking.roomId,
        roomNumber: result.toRoomNumber,
        bedId: result.updatedBooking.bedId,
        bedNumber: result.toBedNumber,
        totalAmount: result.updatedBooking.totalAmount,
        balanceAmount: result.updatedBooking.balanceAmount,
        adjustment: result.adjustment,
        settlementType,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Resident shifted to Room ${result.toRoomNumber} (${result.toBedNumber}) successfully.`,
      data: result.updatedBooking,
    });
  } catch (error: any) {
    console.error("Error shifting resident room:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to shift room" },
      { status: 500 }
    );
  }
}
