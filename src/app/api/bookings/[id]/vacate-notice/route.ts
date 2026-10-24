import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { id: bookingId } = await params;
    const body = await req.json();
    const action = body.action || "SUBMIT"; // "SUBMIT" | "WITHDRAW"

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        room: { include: { roomType: true } },
        bed: true,
        hostel: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
    }

    const isStaff = hasPermission(user.role, [
      ROLES.SUPER_ADMIN,
      ROLES.PROPERTY_MANAGER,
      ROLES.RECEPTIONIST,
    ]);

    if (!isStaff && booking.customerId !== user.id) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    if (booking.stayType !== "MONTHLY") {
      return NextResponse.json(
        { success: false, message: "Notice to vacate is only applicable for monthly resident agreements." },
        { status: 400 }
      );
    }

    if (!["CONFIRMED", "CHECKED_IN"].includes(booking.bookingStatus)) {
      return NextResponse.json(
        { success: false, message: "Only active residents can manage vacating notices." },
        { status: 400 }
      );
    }

    const now = new Date();

    if (action === "WITHDRAW") {
      if (booking.isOpenEnded) {
        return NextResponse.json(
          { success: false, message: "No active vacating notice is pending for this booking." },
          { status: 400 }
        );
      }

      // Check if another guest has already reserved this bed starting from or after the scheduled departure
      const futureConflict = await prisma.booking.findFirst({
        where: {
          id: { not: booking.id },
          bedId: booking.bedId,
          checkInDate: { gte: booking.checkOutDate },
          OR: [
            { bookingStatus: { in: ["CONFIRMED", "CHECKED_IN"] } },
            { bookingStatus: "PAYMENT_PENDING", holdExpiresAt: { gt: now } },
          ],
        },
      });

      if (futureConflict) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Cannot withdraw notice: this bed has already been booked by an incoming resident following your scheduled departure date. Please consult front desk.",
          },
          { status: 409 }
        );
      }

      const noteEntry = `[NOTICE_WITHDRAWN: ${now.toISOString().split("T")[0]} by ${user.name} (${user.role})]`;
      const updatedNotes = booking.internalNotes ? `${booking.internalNotes}\n${noteEntry}` : noteEntry;

      const updatedBooking = await prisma.booking.update({
        where: { id: booking.id },
        data: {
          isOpenEnded: true,
          internalNotes: updatedNotes,
        },
        include: { hostel: true, room: true, bed: true },
      });

      await logAuditAction({
        userId: user.id,
        userName: user.name,
        action: "VACATING_NOTICE_WITHDRAWN",
        entity: "Booking",
        entityId: booking.id,
        previousValue: { isOpenEnded: false, checkOutDate: booking.checkOutDate.toISOString() },
        newValue: { isOpenEnded: true },
      });

      return NextResponse.json({
        success: true,
        message: "Notice to vacate withdrawn successfully. Month-to-month residency restored.",
        data: { booking: updatedBooking },
      });
    }

    // ACTION === "SUBMIT"
    const { vacateDate, reason } = body;
    if (!vacateDate) {
      return NextResponse.json({ success: false, message: "Intended vacating date is required." }, { status: 400 });
    }

    const requestedVacateDate = new Date(vacateDate);
    if (isNaN(requestedVacateDate.getTime())) {
      return NextResponse.json({ success: false, message: "Invalid vacating date format." }, { status: 400 });
    }

    // Check minimum 30 days notice for customers
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    const minNoticeDate = new Date(todayMidnight);
    minNoticeDate.setDate(minNoticeDate.getDate() + 30);

    if (!isStaff && requestedVacateDate < minNoticeDate) {
      return NextResponse.json(
        {
          success: false,
          message: `Hostel policy requires a minimum 30-day advance notice. Earliest eligible departure date is ${minNoticeDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}.`,
        },
        { status: 400 }
      );
    }

    // Date must be in the future
    if (requestedVacateDate <= todayMidnight) {
      return NextResponse.json({ success: false, message: "Vacating date must be in the future." }, { status: 400 });
    }

    const noteEntry = `[NOTICE_SERVED: ${now.toISOString().split("T")[0]} | Departure: ${requestedVacateDate.toISOString().split("T")[0]}${reason ? ` | Reason: ${reason}` : ""} | By: ${user.name} (${user.role})]`;
    const updatedNotes = booking.internalNotes ? `${booking.internalNotes}\n${noteEntry}` : noteEntry;

    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        isOpenEnded: false,
        checkOutDate: requestedVacateDate,
        internalNotes: updatedNotes,
      },
      include: { hostel: true, room: true, bed: true },
    });

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: "VACATING_NOTICE_SUBMITTED",
      entity: "Booking",
      entityId: booking.id,
      previousValue: { isOpenEnded: booking.isOpenEnded, checkOutDate: booking.checkOutDate.toISOString() },
      newValue: {
        isOpenEnded: false,
        checkOutDate: requestedVacateDate.toISOString(),
        reason: reason || "Notice served",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Vacating notice recorded. Scheduled checkout date is ${requestedVacateDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}. Future dates have been released for incoming bookings.`,
      data: { booking: updatedBooking },
    });
  } catch (error: any) {
    console.error("Vacating notice error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to process vacating notice" },
      { status: 500 }
    );
  }
}
