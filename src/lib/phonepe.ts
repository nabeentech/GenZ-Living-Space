import { createHash, timingSafeEqual } from "node:crypto";

const isProduction = process.env.PHONEPE_ENV === "PRODUCTION";
const BASE_URL = isProduction
  ? "https://api.phonepe.com/apis/pg"
  : "https://api-preprod.phonepe.com/apis/pg-sandbox";
const TOKEN_URL = isProduction
  ? "https://api.phonepe.com/apis/identity-manager/v1/oauth/token"
  : "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token";

export type TokenResponse = {
  access_token: string;
  token_type: "O-Bearer" | string;
  expires_at: number;
};

export type PhonePeOrderStatus = {
  orderId: string;
  state: "COMPLETED" | "PENDING" | "FAILED" | string;
  amount: number;
  expireAt?: number;
  paymentDetails?: Array<{
    transactionId?: string;
    amount: number;
    state: string;
    paymentMode?: string;
    errorCode?: string;
    detailedErrorCode?: string;
  }>;
};

export type CreatePaymentInput = {
  merchantOrderId: string;
  amount: number; // In paise (minimum 100)
  redirectUrl: string;
  metaInfo?: Record<string, string>;
};

let cachedToken: TokenResponse | null = null;
let tokenRefreshPromise: Promise<TokenResponse> | null = null;

export function isPhonePeConfigured(): boolean {
  return Boolean(
    process.env.PHONEPE_CLIENT_ID &&
    process.env.PHONEPE_CLIENT_SECRET &&
    process.env.PHONEPE_CLIENT_VERSION
  );
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export async function getAccessToken(): Promise<TokenResponse> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  // Refresh 60 seconds before expiry
  if (cachedToken && cachedToken.expires_at > nowSeconds + 60) {
    return cachedToken;
  }

  if (tokenRefreshPromise) return tokenRefreshPromise;

  tokenRefreshPromise = (async () => {
    const body = new URLSearchParams({
      client_id: requiredEnv("PHONEPE_CLIENT_ID"),
      client_secret: requiredEnv("PHONEPE_CLIENT_SECRET"),
      client_version: requiredEnv("PHONEPE_CLIENT_VERSION"),
      grant_type: "client_credentials",
    });

    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("PhonePe OAuth failed:", response.status, errText);
      throw new Error(`PhonePe OAuth failed: HTTP ${response.status}`);
    }

    const token = (await response.json()) as TokenResponse;
    if (
      !token.access_token ||
      !token.expires_at ||
      (token.token_type && token.token_type !== "O-Bearer")
    ) {
      throw new Error("Invalid PhonePe OAuth response format");
    }

    cachedToken = token;
    return token;
  })();

  try {
    return await tokenRefreshPromise;
  } finally {
    tokenRefreshPromise = null;
  }
}

async function phonePeFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `O-Bearer ${token.access_token}`,
      ...init.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`PhonePe API ${path} returned HTTP ${response.status}:`, errText);
    throw new Error(`PhonePe API returned HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function createPayment(input: CreatePaymentInput): Promise<{
  orderId: string;
  state: string;
  expireAt: number;
  redirectUrl: string;
}> {
  if (!/^[A-Za-z0-9_-]{1,63}$/.test(input.merchantOrderId)) {
    throw new Error("Invalid merchantOrderId format (max 63 chars, alphanumeric, _ or -)");
  }

  if (!Number.isSafeInteger(input.amount) || input.amount < 100) {
    throw new Error("Amount must be an integer of at least 100 paise");
  }

  // Fallback simulator for local development if credentials are not yet configured
  if (!isPhonePeConfigured()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("PhonePe credentials are not configured in production");
    }

    const orderId = `OMO_SIM_${Date.now()}`;
    const returnUrl = new URL(input.redirectUrl);
    returnUrl.searchParams.set("merchantOrderId", input.merchantOrderId);
    returnUrl.searchParams.set("simulated", "true");

    return {
      orderId,
      state: "PENDING",
      expireAt: Date.now() + 1200 * 1000,
      redirectUrl: returnUrl.toString(),
    };
  }

  return phonePeFetch<{
    orderId: string;
    state: string;
    expireAt: number;
    redirectUrl: string;
  }>("/checkout/v2/pay", {
    method: "POST",
    body: JSON.stringify({
      merchantOrderId: input.merchantOrderId,
      amount: input.amount,
      expireAfter: 1200,
      paymentFlow: {
        type: "PG_CHECKOUT",
        merchantUrls: {
          redirectUrl: input.redirectUrl,
        },
      },
      ...(input.metaInfo ? { metaInfo: input.metaInfo } : {}),
    }),
  });
}

export async function checkOrderStatus(merchantOrderId: string): Promise<PhonePeOrderStatus> {
  if (!/^[A-Za-z0-9_-]{1,63}$/.test(merchantOrderId)) {
    throw new Error("Invalid merchantOrderId format");
  }

  // Fallback simulator for development
  if (!isPhonePeConfigured()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("PhonePe credentials are not configured in production");
    }
    return {
      orderId: `OMO_SIM_${Date.now()}`,
      state: "COMPLETED",
      amount: 100000,
      paymentDetails: [
        {
          transactionId: `TXN_SIM_${Date.now()}`,
          amount: 100000,
          state: "COMPLETED",
          paymentMode: "UPI_INTENT",
        },
      ],
    };
  }

  const params = new URLSearchParams({ details: "false" });
  return phonePeFetch<PhonePeOrderStatus>(
    `/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status?${params}`,
    { method: "GET" }
  );
}

/**
 * Validates PhonePe webhook.
 * Supports SHA-256 (username:password) or HMAC verification depending on PHONEPE_WEBHOOK_AUTH_MODE.
 */
export function verifyPhonePeWebhook(headers: {
  authorization?: string | null;
  keyId?: string | null;
  signature?: string | null;
}, rawBody: string): boolean {
  const authMode = process.env.PHONEPE_WEBHOOK_AUTH_MODE || "SHA";

  if (authMode === "SHA") {
    const authHeader = headers.authorization?.trim();
    if (!authHeader) return false;

    const cleanAuth = authHeader.replace(/^(sha256|bearer|basic)\s+/i, "");
    if (!/^[a-fA-F0-9]{64}$/.test(cleanAuth)) return false;

    const username = process.env.PHONEPE_WEBHOOK_USERNAME || "genz_webhook_user";
    const password = process.env.PHONEPE_WEBHOOK_PASSWORD || "genz_webhook_secure_pass_2026";
    const expected = createHash("sha256")
      .update(`${username}:${password}`, "utf8")
      .digest("hex");

    const expectedBuf = Buffer.from(expected, "hex");
    const receivedBuf = Buffer.from(cleanAuth, "hex");

    return expectedBuf.length === receivedBuf.length && timingSafeEqual(expectedBuf, receivedBuf);
  }

  if (authMode === "HMAC") {
    const signature = headers.signature?.trim();
    if (!signature) return false;

    const secret = process.env.PHONEPE_WEBHOOK_SECRET || process.env.PHONEPE_CLIENT_SECRET;
    if (!secret) return false;

    const expected = createHash("sha256")
      .update(rawBody + secret, "utf8")
      .digest("hex");

    const expectedBuf = Buffer.from(expected);
    const receivedBuf = Buffer.from(signature);

    return expectedBuf.length === receivedBuf.length && timingSafeEqual(expectedBuf, receivedBuf);
  }

  return false;
}

export async function createRefund(params: {
  merchantRefundId: string;
  originalMerchantOrderId: string;
  amount: number; // in paise
}): Promise<{
  refundId: string;
  state: string;
  amount: number;
}> {
  if (!isPhonePeConfigured()) {
    return {
      refundId: `REF_SIM_${Date.now()}`,
      state: "COMPLETED",
      amount: params.amount,
    };
  }

  return phonePeFetch<{
    refundId: string;
    state: string;
    amount: number;
  }>("/payments/v2/refund", {
    method: "POST",
    body: JSON.stringify({
      merchantRefundId: params.merchantRefundId,
      originalMerchantOrderId: params.originalMerchantOrderId,
      amount: params.amount,
    }),
  });
}

