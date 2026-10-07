import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { hasPermission, ROLES } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, [ROLES.RECEPTIONIST, ROLES.PROPERTY_MANAGER, ROLES.SUPER_ADMIN])) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json(
        { success: false, message: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    const searchQuery = query.toUpperCase().trim();

    // Search by booking reference (primary method)
    let booking = await prisma.booking.findFirst({
      where: {
        bookingReference: searchQuery,
      },
      include: {
        hostel: true,
        room: { include: { roomType: true } },
        bed: true,
        customer: true,
      },
    });

    // If not found by reference, search by guest name, email, or phone
    if (!booking) {
      booking = await prisma.booking.findFirst({
        where: {
          OR: [
            { guestEmail: { contains: query.trim() } },
            { guestName: { contains: query.trim() } },
            { guestPhone: { contains: query.trim() } },
          ],
        },
        include: {
          hostel: true,
          room: { include: { roomType: true } },
          bed: true,
          customer: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      });
    }

    if (!booking) {
      return NextResponse.json(
        { success: false, message: `No booking found for query: ${query}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: booking.id,
        bookingReference: booking.bookingReference,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        guestPhone: booking.guestPhone,
        guestGender: booking.guestGender,
        guestGovtId: booking.guestGovtId,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        bookingStatus: booking.bookingStatus,
        hostelName: booking.hostel.name,
        roomNumber: booking.room.roomNumber,
        bedNumber: booking.bed.bedNumber,
        totalAmount: booking.totalAmount,
        paidAmount: booking.paidAmount,
      },
    });
  } catch (error: any) {
    console.error("Booking lookup error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to lookup booking" },
      { status: 500 }
    );
  }
}
