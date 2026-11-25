import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { canAccessModule } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (
      !user ||
      (!canAccessModule(user, "customers") &&
        !canAccessModule(user, "payments") &&
        !canAccessModule(user, "bookings"))
    ) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const { id: customerId } = await params;

    const customer = await prisma.user.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        gender: true,
        dateOfBirth: true,
        address: true,
        emergencyContact: true,
        govtIdType: true,
        govtIdNumber: true,
        aadhaarFrontImage: true,
        aadhaarBackImage: true,
        hasVehicle: true,
        vehicleNumber: true,
        drivingLicenseNumber: true,
        googleId: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    if (!customer) {
      return NextResponse.json({ success: false, message: "Customer not found" }, { status: 404 });
    }

    const bookings = await prisma.booking.findMany({
      where: { customerId },
      include: {
        hostel: { select: { id: true, name: true, city: true } },
        room: { include: { roomType: true } },
        bed: { select: { id: true, bedNumber: true } },
        payments: { orderBy: { createdAt: "desc" } },
        invoices: { orderBy: { createdAt: "desc" } },
        extensions: { orderBy: { createdAt: "desc" } },
        additionalCharges: { orderBy: { createdAt: "desc" } },
        refunds: { orderBy: { requestedAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    let totalBilled = 0;
    let totalPaid = 0;
    let totalRefunded = 0;
    let currentBalanceDue = 0;

    const timeline: Array<{
      id: string;
      type: "BOOKING" | "PAYMENT" | "INVOICE" | "EXTENSION" | "CHARGE" | "REFUND";
      date: string;
      title: string;
      subtitle: string;
      amount?: number;
      status?: string;
      bookingReference: string;
      method?: string | null;
      allocation?: any;
    }> = [];

    for (const booking of bookings) {
      const isInactive = ["CANCELLED", "REFUNDED"].includes(booking.bookingStatus);
      const activeInvoices = booking.invoices.filter((inv) => inv.status !== "CANCELLED");

      if (!isInactive) {
        if (activeInvoices.length > 0) {
          totalBilled += activeInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
        } else {
          totalBilled += booking.totalAmount;
        }
        currentBalanceDue += Math.max(0, booking.balanceAmount || 0);
      }

      const capturedPayments = booking.payments.filter((p) => p.status === "CAPTURED");
      totalPaid += capturedPayments.reduce((sum, p) => sum + p.amount, 0);

      const processedRefunds = booking.refunds.filter((r) => r.status === "PROCESSED");
      totalRefunded += processedRefunds.reduce((sum, r) => sum + r.amount, 0);

      timeline.push({
        id: `booking-${booking.id}`,
        type: "BOOKING",
        date: booking.createdAt.toISOString(),
        title: `${booking.stayType === "MONTHLY" ? "Monthly" : "Daily"} Stay Created`,
        subtitle: `${booking.hostel?.name || "Hostel"} · Rm ${booking.room?.roomNumber || "—"} (${booking.bed?.bedNumber || "—"})`,
        amount: booking.totalAmount,
        status: booking.bookingStatus,
        bookingReference: booking.bookingReference,
      });

      for (const payment of booking.payments) {
        let allocation: any = null;
        if (payment.metadata) {
          try {
            const parsed = JSON.parse(payment.metadata);
            if (parsed && (parsed.depositAllocated !== undefined || parsed.cashForPast !== undefined || parsed.cashForCycleRent !== undefined || parsed.type)) {
              allocation = parsed;
            }
          } catch {
            // ignore non-JSON metadata
          }
        }
        timeline.push({
          id: `payment-${payment.id}`,
          type: "PAYMENT",
          date: payment.createdAt.toISOString(),
          title: allocation?.type === "MONTHLY_RENT_RENEWAL"
            ? "Monthly Rent / Settlement Payment"
            : "Payment Received",
          subtitle: `${payment.paymentMethod || payment.gateway || "OFFLINE"}`,
          amount: payment.amount,
          status: payment.status,
          bookingReference: booking.bookingReference,
          method: payment.paymentMethod || payment.gateway,
          allocation,
        });
      }

      for (const ext of booking.extensions) {
        timeline.push({
          id: `ext-${ext.id}`,
          type: "EXTENSION",
          date: ext.createdAt.toISOString(),
          title: "Stay Extended (30-Day Cycle)",
          subtitle: `${new Date(ext.originalCheckOut).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })} → ${new Date(ext.newCheckOut).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}`,
          amount: ext.additionalAmount,
          status: ext.status,
          bookingReference: booking.bookingReference,
        });
      }

      for (const charge of booking.additionalCharges) {
        timeline.push({
          id: `charge-${charge.id}`,
          type: "CHARGE",
          date: charge.createdAt.toISOString(),
          title: `Extra Charge · ${charge.category}`,
          subtitle: charge.description,
          amount: charge.amount,
          status: charge.status,
          bookingReference: booking.bookingReference,
        });
      }

      for (const refund of booking.refunds) {
        timeline.push({
          id: `refund-${refund.id}`,
          type: "REFUND",
          date: (refund.processedAt || refund.requestedAt).toISOString(),
          title: "Refund",
          subtitle: refund.reason,
          amount: refund.amount,
          status: refund.status,
          bookingReference: booking.bookingReference,
        });
      }
    }

    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const activeBooking =
      bookings.find((b) => ["CHECKED_IN", "CONFIRMED"].includes(b.bookingStatus)) ||
      bookings[0] ||
      null;

    return NextResponse.json({
      success: true,
      data: {
        customer,
        bookings,
        activeBooking,
        summary: {
          totalBilled,
          totalPaid,
          totalRefunded,
          currentBalanceDue,
          totalBookings: bookings.length,
        },
        timeline,
      },
    });
  } catch (error: any) {
    console.error("Customer ledger error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load customer ledger" },
      { status: 500 }
    );
  }
}
