import prisma from "./prisma";
import { checkOrderStatus, diagnostic } from "./phonepe";
import { generateBookingQRCode } from "./qr";
import { createInvoiceWithRetry } from "./invoice";
import { createPaymentReconciler } from "./payment-reconciliation";

const service = createPaymentReconciler({ db: prisma, checkStatus: checkOrderStatus, generateQR: generateBookingQRCode, createInvoice: createInvoiceWithRetry, log: diagnostic });
export const reconcilePhonePePayment = service.reconcile;
export const releaseExpiredBookingHolds = service.releaseExpiredHolds;
