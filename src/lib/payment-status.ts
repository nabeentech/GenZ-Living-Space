import prisma from "./prisma";
import { reconcilePhonePePayment } from "./booking-cleanup";
import { createCustomerPaymentStatus } from "./payment-status-handler";

export const customerPhonePeStatus = createCustomerPaymentStatus({ db: prisma, reconcile: reconcilePhonePePayment });
