import prisma from "./prisma";

/**
 * Generates a collision-proof, sequentially incrementing invoice number.
 * Finds the highest existing sequence number for the current year and loops
 * until an unused number is confirmed.
 */
export async function generateUniqueInvoiceNumber(
  dbClient?: any
): Promise<string> {
  const db = dbClient || prisma;
  const currentYear = new Date().getFullYear();
  const prefix = `GZ-INV-${currentYear}-`;

  try {
    // 1. Fetch recent invoices for the current year to find the true highest sequence number
    const recentInvoices = await db.invoice.findMany({
      where: {
        invoiceNumber: {
          startsWith: prefix,
        },
      },
      select: { invoiceNumber: true },
      orderBy: { invoiceNumber: "desc" },
      take: 20,
    });

    let maxSeq = 0;
    for (const inv of recentInvoices) {
      const parts = inv.invoiceNumber.split("-");
      const seqStr = parts[parts.length - 1];
      const seqNum = parseInt(seqStr, 10);
      if (!isNaN(seqNum) && seqNum > maxSeq) {
        maxSeq = seqNum;
      }
    }

    // Baseline fallback against total count
    const totalCount = await db.invoice.count();
    let candidateSeq = Math.max(maxSeq + 1, totalCount + 1, 1);

    // 2. Loop until we find a guaranteed unused invoice number
    let candidateNumber = `${prefix}${String(candidateSeq).padStart(5, "0")}`;
    let exists = await db.invoice.findUnique({
      where: { invoiceNumber: candidateNumber },
      select: { id: true },
    });

    let attempts = 0;
    while (exists && attempts < 50) {
      candidateSeq++;
      attempts++;
      candidateNumber = `${prefix}${String(candidateSeq).padStart(5, "0")}`;
      exists = await db.invoice.findUnique({
        where: { invoiceNumber: candidateNumber },
        select: { id: true },
      });
    }

    return candidateNumber;
  } catch (error) {
    console.error("Error generating invoice number:", error);
    // Timestamp fallback if database query fails unexpectedly
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}${timestamp}`;
  }
}

/**
 * Creates an invoice safely with automatic retry if a unique constraint collision occurs
 * under concurrent checkout conditions.
 */
export async function createInvoiceWithRetry(
  txOrPrisma: any,
  invoiceData: {
    bookingId: string;
    customerId: string;
    hostelId: string;
    issueDate?: Date;
    dueDate?: Date;
    baseAmount: number;
    taxAmount: number;
    serviceFee?: number;
    securityDeposit?: number;
    discountAmount?: number;
    totalAmount: number;
    paidAmount?: number;
    balanceDue?: number;
    status?: string;
    invoiceNumber?: string;
  }
): Promise<any> {
  const db = txOrPrisma || prisma;
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    attempts++;
    const invoiceNumber =
      attempts === 1 && invoiceData.invoiceNumber
        ? invoiceData.invoiceNumber
        : await generateUniqueInvoiceNumber(db);

    try {
      return await db.invoice.create({
        data: {
          ...invoiceData,
          invoiceNumber,
          issueDate: invoiceData.issueDate || new Date(),
          dueDate: invoiceData.dueDate || new Date(),
          paidAmount: invoiceData.paidAmount ?? 0,
          balanceDue: invoiceData.balanceDue ?? invoiceData.totalAmount,
          status: invoiceData.status || "DUE",
        },
      });
    } catch (err: any) {
      const isUniqueCollision =
        err?.code === "P2002" &&
        (err?.message?.includes("invoiceNumber") ||
          (Array.isArray(err?.meta?.target) &&
            err.meta.target.includes("invoiceNumber")));

      if (isUniqueCollision && attempts < maxAttempts) {
        console.warn(
          `[Invoice] Collision on ${invoiceNumber}, retrying (attempt ${attempts + 1}/${maxAttempts})...`
        );
        continue;
      }
      throw err;
    }
  }
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
