import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { hostelId, category, priority = "MEDIUM", subject, description } =
      await req.json();

    if (!hostelId || !category || !subject || !description) {
      return NextResponse.json(
        { success: false, message: "All fields are required" },
        { status: 400 }
      );
    }

    const ticketNumber = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        customerId: user.id,
        hostelId,
        category,
        priority,
        subject,
        description,
        status: "OPEN",
      },
      include: { hostel: true },
    });

    return NextResponse.json({
      success: true,
      message: `Support ticket #${ticketNumber} submitted. Our community team will review shortly.`,
      data: ticket,
    });
  } catch (error: any) {
    console.error("Support ticket error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to submit ticket" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const where: any = {};
    if (user.role === "CUSTOMER") {
      where.customerId = user.id;
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: { hostel: true, customer: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: tickets });
  } catch (error: any) {
    console.error("Support tickets fetch error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}
