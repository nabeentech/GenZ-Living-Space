import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (
      !user ||
      !hasPermission(user.role, [
        ROLES.SUPER_ADMIN,
        ROLES.PROPERTY_MANAGER,
        ROLES.SUPPORT_STAFF,
        ROLES.RECEPTIONIST,
      ])
    ) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const ticketId = params.id;
    const { staffReply, status = "RESOLVED" } = await req.json();

    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        staffReply,
        status,
        assignedTo: user.name,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Reply saved and ticket status updated",
      data: updated,
    });
  } catch (error: any) {
    console.error("Support ticket reply error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to reply to ticket" },
      { status: 500 }
    );
  }
}
