import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import { createInvoicePdf } from "@/lib/invoice-pdf";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { bookingId: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.bookingId },
      include: {
        hostel: true,
        room: true,
        bed: true,
        invoices: { orderBy: { issueDate: "desc" }, take: 1 },
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
    }

    const isStaff = hasPermission(user.role, [
      ROLES.SUPER_ADMIN,
      ROLES.PROPERTY_MANAGER,
      ROLES.RECEPTIONIST,
      ROLES.FINANCE,
    ]);
    if (!isStaff && booking.customerId !== user.id) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const invoice = booking.invoices[0] || {
      invoiceNumber: `GZ-${booking.bookingReference}`,
      issueDate: booking.createdAt,
    };
    const pdf = await createInvoicePdf({ booking, invoice });

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Invoice PDF error:", error);
    return NextResponse.json({ success: false, message: "Failed to generate invoice PDF" }, { status: 500 });
  }
}
