import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { canAccessModule, canUserDelete, canUserEdit } from "@/lib/permissions";
import { logAuditAction } from "@/lib/audit";
import {
  VALID_EXPENSE_CATEGORY_CODES,
  VALID_EXPENSE_PAYMENT_MODES,
  VALID_EXPENSE_STATUSES,
} from "@/lib/expense-categories";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canAccessModule(user, "expenses") || !canUserEdit(user)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const body = await req.json();
    const data: any = {};

    if (body.title !== undefined) {
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (title.length < 2) {
        return NextResponse.json(
          { error: "Expense title must be at least 2 characters." },
          { status: 400 }
        );
      }
      data.title = title;
    }

    if (body.category !== undefined) {
      const category = typeof body.category === "string" ? body.category.trim() : "";
      if (!VALID_EXPENSE_CATEGORY_CODES.has(category)) {
        return NextResponse.json({ error: "Invalid expense category." }, { status: 400 });
      }
      data.category = category;
    }

    if (body.amount !== undefined) {
      const numericAmount = Number(body.amount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return NextResponse.json({ error: "Amount must be greater than ₹0." }, { status: 400 });
      }
      data.amount = Math.round(numericAmount * 100) / 100;
    }

    if (body.paymentMode !== undefined) {
      const paymentMode =
        typeof body.paymentMode === "string" ? body.paymentMode.trim().toUpperCase() : "";
      if (!VALID_EXPENSE_PAYMENT_MODES.has(paymentMode)) {
        return NextResponse.json({ error: "Invalid payment mode." }, { status: 400 });
      }
      data.paymentMode = paymentMode;
    }

    if (body.status !== undefined) {
      const status = typeof body.status === "string" ? body.status.trim().toUpperCase() : "";
      if (!VALID_EXPENSE_STATUSES.has(status)) {
        return NextResponse.json({ error: "Invalid bill status." }, { status: 400 });
      }
      data.status = status;
    }

    if (body.expenseDate !== undefined) {
      if (typeof body.expenseDate !== "string" || !body.expenseDate.trim()) {
        return NextResponse.json({ error: "Invalid expense date." }, { status: 400 });
      }
      const candidate = body.expenseDate.includes("T")
        ? new Date(body.expenseDate)
        : new Date(`${body.expenseDate.trim()}T12:00:00.000+05:30`);
      if (Number.isNaN(candidate.getTime())) {
        return NextResponse.json({ error: "Invalid expense date." }, { status: 400 });
      }
      data.expenseDate = candidate;
    }

    if (body.hostelId !== undefined) {
      const rawHostelId =
        typeof body.hostelId === "string" &&
        body.hostelId.trim() &&
        body.hostelId !== "all" &&
        body.hostelId !== "common"
          ? body.hostelId.trim()
          : null;
      if (rawHostelId) {
        const hostelExists = await prisma.hostel.findUnique({
          where: { id: rawHostelId },
          select: { id: true },
        });
        if (!hostelExists) {
          return NextResponse.json({ error: "Selected property does not exist." }, { status: 404 });
        }
      }
      data.hostelId = rawHostelId;
    }

    if (body.vendorName !== undefined) {
      data.vendorName = typeof body.vendorName === "string" ? body.vendorName.trim() || null : null;
    }
    if (body.vendorPhone !== undefined) {
      data.vendorPhone = typeof body.vendorPhone === "string" ? body.vendorPhone.trim() || null : null;
    }
    if (body.notes !== undefined) {
      data.notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
    }
    if (body.isRecurring !== undefined) {
      data.isRecurring = Boolean(body.isRecurring);
    }
    if (body.receiptImage !== undefined) {
      if (body.receiptImage === null || body.receiptImage === "") {
        data.receiptImage = null;
      } else if (typeof body.receiptImage === "string") {
        const trimmed = body.receiptImage.trim();
        if (!trimmed.startsWith("data:image/")) {
          return NextResponse.json({ error: "Invalid receipt image format." }, { status: 400 });
        }
        if (trimmed.length > 2_500_000) {
          return NextResponse.json(
            { error: "Receipt image is too large. Please pick a smaller photo." },
            { status: 400 }
          );
        }
        data.receiptImage = trimmed;
      }
    }

    const expense = await prisma.expense.update({
      where: { id },
      data,
      include: {
        hostel: { select: { id: true, name: true } },
      },
    });

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: "UPDATE",
      entity: "EXPENSE",
      entityId: expense.id,
      previousValue: {
        title: existing.title,
        category: existing.category,
        amount: existing.amount,
        status: existing.status,
        paymentMode: existing.paymentMode,
        hostelId: existing.hostelId,
      },
      newValue: {
        title: expense.title,
        category: expense.category,
        amount: expense.amount,
        status: expense.status,
        paymentMode: expense.paymentMode,
        hostelId: expense.hostelId,
      },
    });

    return NextResponse.json({ expense });
  } catch (error) {
    console.error("Failed to update expense:", error);
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canAccessModule(user, "expenses") || !canUserDelete(user)) {
      return NextResponse.json({ error: "Delete permission denied" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    await prisma.expense.delete({ where: { id } });

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: "DELETE",
      entity: "EXPENSE",
      entityId: id,
      previousValue: {
        title: existing.title,
        category: existing.category,
        amount: existing.amount,
        status: existing.status,
        paymentMode: existing.paymentMode,
        hostelId: existing.hostelId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete expense:", error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
