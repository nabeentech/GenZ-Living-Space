import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, [ROLES.SUPER_ADMIN])) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const { sectionKey, contentJson } = await req.json();

    if (!sectionKey || !contentJson) {
      return NextResponse.json({ success: false, message: "Missing CMS payload" }, { status: 400 });
    }

    const record = await prisma.websiteContent.upsert({
      where: { sectionKey },
      update: { contentJson: JSON.stringify(contentJson) },
      create: { sectionKey, contentJson: JSON.stringify(contentJson) },
    });

    return NextResponse.json({
      success: true,
      message: `CMS Section ${sectionKey} updated successfully`,
      data: record,
    });
  } catch (error: any) {
    console.error("CMS update error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to update CMS" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const contents = await prisma.websiteContent.findMany();
    return NextResponse.json({ success: true, data: contents });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
