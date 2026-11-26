import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { canAccessModule, canUserEdit } from "@/lib/permissions";
import { logAuditAction } from "@/lib/audit";
import {
  VALID_EXPENSE_CATEGORY_CODES,
  VALID_EXPENSE_PAYMENT_MODES,
  VALID_EXPENSE_STATUSES,
} from "@/lib/expense-categories";

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canAccessModule(user, "expenses")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const hostelId = searchParams.get("hostelId");
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const paymentMode = searchParams.get("paymentMode");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: any = {};
    if (hostelId && hostelId !== "all") {
      where.hostelId = hostelId === "common" ? null : hostelId;
    }
    if (category && category !== "all") {
      where.category = category;
    }
    if (status && status !== "all") {
      where.status = status;
    }
    if (paymentMode && paymentMode !== "all") {
      where.paymentMode = paymentMode;
    }
    if (from || to) {
      where.expenseDate = {};
      if (from) where.expenseDate.gte = new Date(`${from}T00:00:00.000+05:30`);
      if (to) where.expenseDate.lte = new Date(`${to}T23:59:59.999+05:30`);
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        hostel: { select: { id: true, name: true } },
      },
      orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ expenses });
  } catch (error) {
    console.error("Failed to fetch expenses:", error);
    return NextResponse.json({ error: "Failed to load expenses" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canAccessModule(user, "expenses") || !canUserEdit(user)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "";
    const numericAmount = Number(body.amount);
    const paymentMode =
      typeof body.paymentMode === "string" && body.paymentMode.trim()
        ? body.paymentMode.trim().toUpperCase()
        : "CASH";
    const status =
      typeof body.status === "string" && body.status.trim()
        ? body.status.trim().toUpperCase()
        : "PAID";
    const rawHostelId =
      typeof body.hostelId === "string" && body.hostelId.trim() && body.hostelId !== "all" && body.hostelId !== "common"
        ? body.hostelId.trim()
        : null;
    const vendorName = typeof body.vendorName === "string" ? body.vendorName.trim() || null : null;
    const vendorPhone = typeof body.vendorPhone === "string" ? body.vendorPhone.trim() || null : null;
    const notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
    const isRecurring = Boolean(body.isRecurring);
    const receiptImage =
      typeof body.receiptImage === "string" && body.receiptImage.trim()
        ? body.receiptImage.trim()
        : null;

    if (title.length < 2) {
      return NextResponse.json(
        { error: "Please enter an expense title (at least 2 characters)." },
        { status: 400 }
      );
    }
    if (!VALID_EXPENSE_CATEGORY_CODES.has(category)) {
      return NextResponse.json({ error: "Invalid expense category." }, { status: 400 });
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than ₹0." },
        { status: 400 }
      );
    }
    if (!VALID_EXPENSE_PAYMENT_MODES.has(paymentMode)) {
      return NextResponse.json({ error: "Invalid payment mode." }, { status: 400 });
    }
    if (!VALID_EXPENSE_STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid bill status." }, { status: 400 });
    }
    if (receiptImage) {
      if (!receiptImage.startsWith("data:image/")) {
        return NextResponse.json({ error: "Invalid receipt image format." }, { status: 400 });
      }
      if (receiptImage.length > 2_500_000) {
        return NextResponse.json(
          { error: "Receipt image is too large. Please pick a smaller photo." },
          { status: 400 }
        );
      }
    }

    let parsedDate = new Date();
    if (typeof body.expenseDate === "string" && body.expenseDate.trim()) {
      const candidate = body.expenseDate.includes("T")
        ? new Date(body.expenseDate)
        : new Date(`${body.expenseDate.trim()}T12:00:00.000+05:30`);
      if (Number.isNaN(candidate.getTime())) {
        return NextResponse.json({ error: "Invalid expense date." }, { status: 400 });
      }
      parsedDate = candidate;
    }

    if (rawHostelId) {
      const hostelExists = await prisma.hostel.findUnique({
        where: { id: rawHostelId },
        select: { id: true },
      });
      if (!hostelExists) {
        return NextResponse.json({ error: "Selected property does not exist." }, { status: 404 });
      }
    }

    const expense = await prisma.expense.create({
      data: {
        title,
        category,
        amount: Math.round(numericAmount * 100) / 100,
        expenseDate: parsedDate,
        paymentMode,
        status,
        hostelId: rawHostelId,
        vendorName,
        vendorPhone,
        receiptImage,
        isRecurring,
        notes,
        recordedById: user.id,
        recordedByName: user.name,
      },
      include: {
        hostel: { select: { id: true, name: true } },
      },
    });

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: "CREATE",
      entity: "EXPENSE",
      entityId: expense.id,
      newValue: {
        title: expense.title,
        category: expense.category,
        amount: expense.amount,
        status: expense.status,
        paymentMode: expense.paymentMode,
        hostelId: expense.hostelId,
        expenseDate: expense.expenseDate,
      },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error("Failed to create expense:", error);
    return NextResponse.json({ error: "Failed to save expense" }, { status: 500 });
  }
}
