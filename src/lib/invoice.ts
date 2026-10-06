import prisma from "./prisma";

export async function generateUniqueInvoiceNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const count = await prisma.invoice.count();
  const sequence = String(count + 1).padStart(5, "0");
  return `GZ-INV-${currentYear}-${sequence}`;
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
