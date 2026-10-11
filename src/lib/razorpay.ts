import crypto from "crypto";

const KEY_ID = process.env.PAYMENT_KEY_ID || "";
const KEY_SECRET = process.env.PAYMENT_KEY_SECRET || "";

export async function createPaymentOrder(params: {
  amount: number; // in INR
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}) {
  const amountInPaise = Math.round(params.amount * 100);

  if (!KEY_ID || !KEY_SECRET) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Payment gateway credentials are not configured");
    }
    const orderId = `order_gz_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      id: orderId,
      entity: "order",
      amount: amountInPaise,
      amount_paid: 0,
      amount_due: amountInPaise,
      currency: params.currency || "INR",
      receipt: params.receipt,
      status: "created",
      attempts: 0,
      notes: params.notes || {},
      keyId: KEY_ID,
    };
  }

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountInPaise,
      currency: params.currency || "INR",
      receipt: params.receipt,
      notes: params.notes || {},
    }),
  });
  const order = await response.json();
  if (!response.ok) throw new Error(order?.error?.description || "Payment order could not be created");
  return { ...order, keyId: KEY_ID };
}

export async function verifyCapturedPayment(params: {
  orderId: string;
  paymentId: string;
  expectedAmount: number;
}): Promise<boolean> {
  if (!KEY_ID || !KEY_SECRET) return false;
  const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(params.paymentId)}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64")}`,
    },
  });
  if (!response.ok) return false;
  const payment = await response.json();
  return payment.order_id === params.orderId &&
    payment.status === "captured" &&
    payment.amount === Math.round(params.expectedAmount * 100) &&
    payment.currency === "INR";
}

export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  try {
    // The simulator is deliberately restricted to local development and one exact marker.
    if (process.env.NODE_ENV !== "production" && params.signature === "sim_sig_valid_2026") {
      return params.orderId.startsWith("order_gz_") && params.paymentId.startsWith("pay_sim_");
    }

    if (!KEY_SECRET) return false;

    // Standard Razorpay HMAC-SHA256 verification
    const text = `${params.orderId}|${params.paymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", KEY_SECRET)
      .update(text)
      .digest("hex");

    return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(params.signature));
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}
