import { createHash, timingSafeEqual } from "node:crypto";

const environment = process.env.PHONEPE_ENV || "SANDBOX";
if (environment !== "PRODUCTION" && environment !== "SANDBOX") {
  throw new Error("PHONEPE_ENV must be SANDBOX or PRODUCTION");
}
const isProduction = environment === "PRODUCTION";
const BASE_URL = isProduction
  ? "https://api.phonepe.com/apis/pg"
  : "https://api-preprod.phonepe.com/apis/pg-sandbox";
const TOKEN_URL = isProduction
  ? "https://api.phonepe.com/apis/identity-manager/v1/oauth/token"
  : "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token";

export class PhonePePaymentNotCreatedError extends Error {}

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
  holdExpiresAt?: Date;
};

let cachedToken: TokenResponse | null = null;
let tokenRefreshPromise: Promise<TokenResponse> | null = null;

// Opt in on the server only. Never log headers, raw provider bodies, metadata,
// redirect URLs (which may contain session tokens), or OAuth request values.
export function diagnostic(event: string, details: Record<string, unknown>): void {
  if (process.env.PHONEPE_DIAGNOSTICS !== "true") return;
  console.info("PhonePe diagnostic", JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    environment: isProduction ? "PRODUCTION" : "SANDBOX",
    ...details,
  }));
}

async function providerErrorCode(response: Response): Promise<string | undefined> {
  const body = await response.json().catch(() => null);
  const code = body?.code;
  return typeof code === "string" && /^[A-Z0-9_]{1,80}$/.test(code) ? code : undefined;
}

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
      diagnostic("oauth.error", { status: response.status, code: await providerErrorCode(response) });
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
  const statusOrder = path.match(/^\/checkout\/v2\/order\/([^/]+)\/status/);
  let merchantOrderId: string | undefined = statusOrder ? decodeURIComponent(statusOrder[1]) : undefined;
  if (process.env.PHONEPE_DIAGNOSTICS === "true" && path === "/checkout/v2/pay" && typeof init.body === "string") {
    // Inspect the final serialized body, rather than an earlier builder input.
    const body = JSON.parse(init.body);
    merchantOrderId = body.merchantOrderId;
    diagnostic("checkout.request", {
      endpoint: `${BASE_URL}${path}`,
      merchantOrderId: body.merchantOrderId,
      amountPaise: body.amount,
      expireAfterSeconds: body.expireAfter,
      fields: Object.keys(body),
      paymentFlowFields: Object.keys(body.paymentFlow),
      paymentModeConfig: body.paymentFlow.paymentModeConfig,
      metaInfoKeys: Object.keys(body.metaInfo ?? {}),
    });
  }
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

  diagnostic("api.response", {
    operation: path === "/checkout/v2/pay" ? "createPayment" : statusOrder ? "orderStatus" : "other",
    status: response.status,
    merchantOrderId,
    requestId: response.headers.get("x-request-id"),
    correlationId: response.headers.get("x-correlation-id"),
  });
  if (!response.ok) {
    diagnostic("api.error", { merchantOrderId, status: response.status, code: await providerErrorCode(response) });
    throw new Error(`PhonePe API returned HTTP ${response.status}`);
  }

  const result = await response.json();
  if (path === "/checkout/v2/pay") {
    diagnostic("checkout.created", {
      merchantOrderId,
      orderId: result.orderId,
      state: result.state,
      expireAt: result.expireAt,
    });
  }
  if (statusOrder) diagnostic("order.status", {
    merchantOrderId, orderId: result.orderId, state: result.state,
    amountPaise: result.amount, expireAt: result.expireAt,
  });
  return result as T;
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

  let expireAfter: number;
  try {
    if (!isPhonePeConfigured()) throw new Error("PhonePe credentials are not configured");
    await getAccessToken(); // Authenticate before computing the remaining hold.
    expireAfter = checkoutExpirySeconds(input.holdExpiresAt);
  } catch {
    throw new PhonePePaymentNotCreatedError("Payment was not sent: check gateway configuration or booking hold");
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
      expireAfter,
      paymentFlow: {
        type: "PG_CHECKOUT",
        merchantUrls: {
          redirectUrl: input.redirectUrl,
        },
        paymentModeConfig: {
          // Payment-mode schema V2 (distinct from the checkout API version).
          // https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/create-payment/configure-payment-modes
          version: "V2",
          enabledPaymentModes: [
            {
              type: "UPI",
              flows: ["QR", "INTENT", "COLLECT"],
            },
            {
              type: "CARD",
              types: ["CREDIT_CARD", "DEBIT_CARD"],
            },
            {
              type: "NET_BANKING",
            },
          ],
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

  if (!isPhonePeConfigured()) throw new Error("PhonePe credentials are not configured");

  const params = new URLSearchParams({ details: "false" });
  return phonePeFetch<PhonePeOrderStatus>(
    `/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status?${params}`,
    { method: "GET" }
  );
}

// Use the documented SHA256(username:password) mode. HMAC is deliberately
// rejected until PhonePe provides a verified algorithm/encoding test vector.
export function verifyPhonePeWebhook(headers: {
  authorization?: string | null;
  keyId?: string | null;
  signature?: string | null;
}, _rawBody: string): boolean {
  if ((process.env.PHONEPE_WEBHOOK_AUTH_MODE || "SHA") !== "SHA") return false;
  const username = process.env.PHONEPE_WEBHOOK_USERNAME;
  const password = process.env.PHONEPE_WEBHOOK_PASSWORD;
  if (!username || !password) return false;
  const digest = headers.authorization?.trim();
  if (!digest || !/^[a-fA-F0-9]{64}$/.test(digest)) return false;
  const expected = createHash("sha256").update(`${username}:${password}`, "utf8").digest();
  return timingSafeEqual(expected, Buffer.from(digest, "hex"));
}

// Reserve 60 seconds for OAuth/network latency. PhonePe's documented minimum
// is 300 seconds; never silently extend a nearly expired booking to satisfy it.
export function checkoutExpirySeconds(holdExpiresAt?: Date, now = Date.now()): number {
  const seconds = holdExpiresAt
    ? Math.min(1200, Math.floor((holdExpiresAt.getTime() - now) / 1000) - 60)
    : 1200;
  if (!Number.isFinite(seconds) || seconds < 300) {
    throw new Error("Booking hold has less than six minutes remaining; create a fresh booking");
  }
  return seconds;
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
    throw new Error("PhonePe credentials are not configured");
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

