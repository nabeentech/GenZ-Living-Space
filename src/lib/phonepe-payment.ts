import prisma from "./prisma";
import { createPayment, diagnostic } from "./phonepe";
import { createPhonePeSender } from "./payment-initiation";

export const sendPhonePePayment = createPhonePeSender(prisma, createPayment, diagnostic);
