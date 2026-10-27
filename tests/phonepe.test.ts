import assert from "node:assert/strict";
import { test } from "node:test";

// No real network or .env loading: fail closed if an unexpected fetch occurs.
for (const environment of ["SANDBOX", "PRODUCTION"]) {
  test(`serialized checkout and redacted diagnostics: ${environment}`, async () => {
    process.env.PHONEPE_ENV = environment;
    process.env.PHONEPE_CLIENT_ID = "test-client";
    process.env.PHONEPE_CLIENT_SECRET = "SECRET_SENTINEL";
    process.env.PHONEPE_CLIENT_VERSION = "1";
    process.env.PHONEPE_DIAGNOSTICS = "true";
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const logs: unknown[] = [];
    const originalFetch = globalThis.fetch;
    const originalInfo = console.info;
    globalThis.fetch = async (url, init = {}) => {
      calls.push({ url: String(url), init });
      if (String(url).endsWith("/oauth/token")) return Response.json({ access_token: "TOKEN_SENTINEL", expires_at: 9999999999, token_type: "O-Bearer" });
      assert.ok(String(url).endsWith("/checkout/v2/pay"));
      return Response.json({ orderId: "OMO_TEST", state: "PENDING", expireAt: 1, redirectUrl: "https://example.com/?token=SESSION_SENTINEL" }, { headers: { "x-request-id": "req-test" } });
    };
    console.info = (...args) => { logs.push(args); };
    try {
      const { createPayment } = await import(`../src/lib/phonepe.ts?environment=${environment}`);
      await createPayment({ merchantOrderId: `TEST_${environment}`, amount: 1000, redirectUrl: "https://example.com/?customer=CUSTOMER_SENTINEL", metaInfo: { udf1: "CUSTOMER_SENTINEL" } });
      const body = JSON.parse(calls[1].init.body as string);
      assert.deepEqual(body.paymentFlow.paymentModeConfig, { version: "V2", enabledPaymentModes: [{ type: "UPI", flows: ["QR", "INTENT", "COLLECT"] }, { type: "CARD", types: ["CREDIT_CARD", "DEBIT_CARD"] }, { type: "NET_BANKING" }] });
      assert.equal(body.amount, 1000);
      assert.equal(body.paymentFlow.type, "PG_CHECKOUT");
      assert.equal(body.expireAfter, 1200);
      assert.equal(body.merchantOrderId, `TEST_${environment}`);
      assert.ok(calls.every(call => new URL(call.url).hostname === (environment === "PRODUCTION" ? "api.phonepe.com" : "api-preprod.phonepe.com")));
      const authBody = new URLSearchParams(calls[0].init.body as string);
      assert.equal(authBody.get("client_secret"), "SECRET_SENTINEL");
      assert.equal(authBody.get("client_version"), "1");
      assert.equal((calls[1].init.headers as Record<string,string>).Authorization, "O-Bearer TOKEN_SENTINEL");
      const serializedLogs = JSON.stringify(logs);
      for (const secret of ["SECRET_SENTINEL", "TOKEN_SENTINEL", "SESSION_SENTINEL", "CUSTOMER_SENTINEL"]) assert.ok(!serializedLogs.includes(secret));
      assert.ok(serializedLogs.includes("req-test"));
      const events = (logs as unknown[][]).map(entry => JSON.parse(entry[1] as string));
      const requestEvent = events.find(event => event.event === "checkout.request");
      assert.equal(requestEvent.amountPaise, 1000);
      assert.equal(requestEvent.expireAfterSeconds, 1200);
      assert.deepEqual(requestEvent.paymentModeConfig, body.paymentFlow.paymentModeConfig);
      const createdEvent = events.find(event => event.event === "checkout.created");
      assert.equal(createdEvent.orderId, "OMO_TEST");
      assert.equal(createdEvent.merchantOrderId, `TEST_${environment}`);
      assert.equal(createdEvent.state, "PENDING");
      process.env.PHONEPE_DIAGNOSTICS = "false";
      logs.length = 0;
      await createPayment({ merchantOrderId: "TEST_NO_META", amount: 100, redirectUrl: "https://example.com" });
      assert.ok(!("metaInfo" in JSON.parse(calls[2].init.body as string)));
      assert.equal(logs.length, 0);
      await assert.rejects(createPayment({ merchantOrderId: "bad id", amount: 100, redirectUrl: "https://example.com" }));
      await assert.rejects(createPayment({ merchantOrderId: "TEST", amount: 99, redirectUrl: "https://example.com" }));
      const hold = new Date(Date.now() + 15 * 60 * 1000);
      await createPayment({ merchantOrderId: "TEST_HELD", amount: 100, redirectUrl: "https://example.com", holdExpiresAt: hold });
      const heldBody = JSON.parse(calls[3].init.body as string);
      assert.ok(heldBody.expireAfter >= 300 && heldBody.expireAfter <= 840);
      assert.deepEqual(heldBody.paymentFlow.paymentModeConfig, body.paymentFlow.paymentModeConfig);
      const beforeRejected = calls.length;
      await assert.rejects(createPayment({ merchantOrderId: "TEST_EXPIRED", amount: 100, redirectUrl: "https://example.com", holdExpiresAt: new Date(Date.now() + 120000) }));
      assert.equal(calls.length, beforeRejected);
      process.env.PHONEPE_DIAGNOSTICS = "true";
      globalThis.fetch = async () => Response.json({ code: "BAD_REQUEST", message: "SESSION_SENTINEL" }, { status: 400 });
      await assert.rejects(createPayment({ merchantOrderId: "TEST_ERROR", amount: 100, redirectUrl: "https://example.com" }), /HTTP 400/);
      assert.ok(JSON.stringify(logs).includes("BAD_REQUEST"));
      assert.ok(!JSON.stringify(logs).includes("SESSION_SENTINEL"));
    } finally {
      globalThis.fetch = originalFetch;
      console.info = originalInfo;
    }
  });
}
