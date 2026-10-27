import prisma from "@/lib/prisma";
import { verifyPhonePeWebhook, diagnostic } from "@/lib/phonepe";
import { reconcilePhonePePayment } from "@/lib/booking-cleanup";
import { createPhonePeWebhookHandler } from "@/lib/payment-webhook";

export const runtime = "nodejs";
export const POST = createPhonePeWebhookHandler({ db: prisma, verify: verifyPhonePeWebhook, reconcile: reconcilePhonePePayment, log: diagnostic });
