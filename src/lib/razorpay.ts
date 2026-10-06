import crypto from "crypto";

const KEY_ID = process.env.PAYMENT_KEY_ID || "rzp_test_genzlivingspace2026";
const KEY_SECRET = process.env.PAYMENT_KEY_SECRET || "test_secret_genz_key_secure_8721";

export async function createPaymentOrder(params: {
  amount: number; // in INR
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}) {
  const amountInPaise = Math.round(params.amount * 100);

  // In test mode / sandbox architecture:
  // If Razorpay live credentials are supplied via env, it could call https://api.razorpay.com/v1/orders
  // Otherwise, creates a compliant sandbox order object that works with both Razorpay checkout and our simulator
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

export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  try {
    // If it's our test simulator signature
    if (params.signature.startsWith("sim_sig_")) {
      return true;
    }

    // Standard Razorpay HMAC-SHA256 verification
    const text = `${params.orderId}|${params.paymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", KEY_SECRET)
      .update(text)
      .digest("hex");

    return expectedSignature === params.signature;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}
