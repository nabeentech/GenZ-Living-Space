# PhonePe desktop QR investigation

> Historical inspection. See [payment-flow-fixes.md](payment-flow-fixes.md) for implemented corrections and the current deployment/log checklist.

Inspected 27 October 2026, 10:57 IST (UTC+05:30). No production requests, transactions, charges, or messages were sent. No live sandbox requests were made: the only local credential set selects PRODUCTION; sandbox credential ownership is unavailable.

## Conclusion

There is no confirmed payment-mode payload defect in this checkout. The existing payload matches the current, dedicated PhonePe payment-mode **version V2** documentation. This is distinct from the checkout API's `/checkout/v2` version. Do not replace its UPI object with V1 instrument types while retaining `version: "V2"`.

Official sources inspected:

- [Create Payment](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/create-payment): endpoints, O-Bearer header, order ID rules, paise minimum, expiry range, metadata names, redirects, and older mode examples.
- [Configure Payment Modes](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/create-payment/configure-payment-modes): explicitly documents paymentModeConfig V2 versus V1 and their mutually exclusive schemas.
- [Payment Mode Reference](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/create-payment/payment-mode): UPI QR, intent and collect flow dimensions; card dimensions.
- [Authorization](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/authorization): client credentials and environment-specific OAuth endpoints.
- [Invoke PayPage](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/invoke-iframe-paypage): iframe and redirect invocation.
- [Order Status](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/order-status).
- [Webhooks](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/webhook).

The top-level Create Payment page presents the older schema: `UPI_QR`, `UPI_INTENT`, and `CARD.cardTypes`, with no mode-config V2 version. The linked current configuration reference explicitly supports `version: "V2"`, `UPI.flows: ["INTENT", "COLLECT", "QR"]`, and `CARD.types`. It states V1 type names are ignored in a V2 configuration. Thus `flows` is supported by this endpoint; it is not evidence of a field copied from an unrelated product. Schema conformance alone cannot prove hosted QR display or merchant eligibility. No provider evidence establishes QR activation or deactivation for merchant M23F2VQ8M6JFE.

## Integration trace (repository-relative files and one-based lines)

- `package.json:29`: Next.js dependency; no PhonePe backend SDK dependency. Direct server-side fetch, no SDK serialization layer.
- `src/lib/phonepe.ts:3`: one module-level PHONEPE_ENV switch controls both OAuth and API endpoints. Exact PRODUCTION selects production; anything else selects sandbox. Restart the server after changing environment values. OAuth maps PHONEPE_CLIENT_ID, PHONEPE_CLIENT_SECRET, PHONEPE_CLIENT_VERSION into client_id, client_secret, client_version and grant_type=client_credentials. Values were not printed. All three local fields are present. Their account/environment validity and mapping to the supplied merchant ID are unverified. PHONEPE_MERCHANT_ID is not part of this OAuth V2 request.
- `src/app/api/payments/create-order/route.ts:9`: authenticated booking/balance checkout. Server derives initial amount from database; creates PENDING payment before calling provider. Merchant order ID generated at line 115; shared createPayment call at 138. Redirect origin uses APP_BASE_URL, then NEXT_PUBLIC_APP_URL, then localhost at 107. Metadata uses documented udf1/udf2.
- `src/app/api/bookings/[id]/monthly-rent/route.ts:254`: same redirect-origin selection, separate rent order ID at 261, same createPayment call at 308. Same credentials, endpoint and restrictions.
- `src/lib/phonepe.ts`: createPayment validates order ID and amount, calls POST `/checkout/v2/pay` with PG_CHECKOUT, 1200-second expiry, merchantUrls.redirectUrl, optional metaInfo and the explicit V2 allowlist. JSON.stringify goes straight into fetch; no transformations, overwrites or later restrictions. Optional metaInfo is deliberately absent when undefined. QR/intent/collect, credit/debit cards and net banking remain enabled. No disable list, duplicate UPI constraint, app filter or instrument filter exists.
- `src/app/(public)/book/BookClient.tsx:776,800`: initial/retry calls use `/api/payments/create-order`; direct window.location.href at 783/807.
- `src/app/(public)/dashboard/CustomerDashboardClient.tsx:275,387`: booking/balance and rent checkout also directly navigate. No PhonePe iframe, checkout script, user-agent branching or alternate mobile builder was found. Direct-navigation comparison is already the current implementation, so changing iframe invocation is not a supported fix.
- `src/app/(public)/payment/return/page.tsx:35`: browser return polls server status, not redirect-supplied payment success. The simulated query parameter does not itself authorize a paid state.
- `src/app/api/payments/status/route.ts:81`: authoritative GET `/checkout/v2/order/{merchantOrderId}/status?details=false` before crediting PENDING records; completed records return database status. Atomic PENDING update avoids duplicate credit on this path.
- `src/app/api/payments/verify/route.ts:25`: PhonePe branch forwards to status; remaining code serves a separate Razorpay integration.
- `src/app/api/payments/webhook/route.ts:32`: server webhook authentication, then order lookup and reconciliation. Supported checkout completion/failure event names are handled.
- `src/lib/booking-cleanup.ts:51`: expired holds consult PhonePe before reconciliation/release.
- `src/app/api/cron/reconcile-payments/route.ts:56`: polls recent PENDING orders, but currently only counts completed results for non-expired bookings; it does not itself persist those completions.

Source and deployment equality cannot be established without deployed revision/environment information and fresh diagnostic output. No server logs, fresh checkout URLs, provider correlation IDs, deployed browser session or equivalent desktop/mobile orders were supplied. Browser access alone cannot create equivalent sandbox sessions without sandbox credentials.

## Minimal changes and validation

Preserved the existing documented mode payload and checkout/navigation/reconciliation behavior. Removed raw provider error-body logging, which could disclose arbitrary provider content. Added opt-in server-only PHONEPE_DIAGNOSTICS=true to capture the final serialized checkout structure (field names, mode config, metadata key names, merchantOrderId), endpoint, environment, UTC timestamp, HTTP status, constrained error code and response request/correlation IDs when available. Metadata values, redirect URLs, OAuth credentials, bearer tokens and raw provider responses are excluded. Disable after collecting evidence. Never paste complete checkout URLs into shared logs or support messages.

`node --import tsx --test tests/phonepe.test.ts`: 2 tests passed. All HTTP calls are mocked, including the test labeled PRODUCTION. Tests cover exact serialized modes/nesting, shared environment host selection, OAuth field mapping, authorization, omitted optional metadata, invalid ID/amount rejection, opt-in logging, request ID capture and sensitive sentinel redaction on success/error.

`npx tsc --noEmit --incremental false`: passed, including new tests.

`npm run lint`: failed before linting: existing script invokes removed Next.js 16 `next lint` and interprets lint as a directory. ESLint migration/dependency work was left outside this payment investigation. A production build was not needed to establish serialization and would not verify PhonePe hosted QR.

No payload fix or real hosted desktop QR fix is claimed.

## Separate reconciliation findings (unchanged)

These do not explain missing QR and need their own focused changes/tests: status completion does not compare provider amount with expected amount; webhook amount validation permits an absent/zero amount and a five-paise tolerance; webhook authentication is bypassed for all development requests; SHA authentication has hardcoded fallback credentials; the HMAC-labeled branch hashes rawBody+secret rather than using a standard HMAC primitive; cleanup may release a hold following a status error and lacks the same atomic PENDING guard as status/webhook. The provider documentation does not specify enough HMAC encoding/algorithm detail to safely invent its replacement. Do not consider the entire integration verified solely because its mode configuration conforms to the schema.

## Smallest next evidence and comparison

Obtain a separate confirmed sandbox client credential set through secure server configuration (do not paste secrets into chat), plus a sandbox callback origin. Then:

1. Restart with PHONEPE_ENV=SANDBOX and PHONEPE_DIAGNOSTICS=true. Verify OAuth and payment hosts are api-preprod.phonepe.com. Never relabel or reuse the current production credentials as sandbox credentials.
2. Create equivalent test orders, each with a new merchantOrderId and a new session. Request A omits paymentModeConfig entirely to use provider defaults. Request B uses the existing valid V2 mode config below, preserving cards/net banking/mobile UPI. Make the comparison in a sandbox-only harness; no unverified payload switch has been added to production.
3. For each configuration open separate fresh desktop and actual mobile sessions, record visible instruments, time with timezone, merchant/provider order IDs, HTTP status and request/correlation IDs. Inspect console and failed network requests; redact cookies, tokens, customer data and URL queries from exports. A spoofed user agent is not proof of merchant eligibility.
4. Compare deployed diagnostic payload to this revision. If QR is still absent, request PhonePe eligibility evidence using the draft below. Sandbox results alone do not establish production merchant eligibility.

## Unsent PhonePe support draft

Subject: Desktop UPI QR absent in Standard Checkout — M23F2VQ8M6JFE

Merchant ID supplied by merchant: M23F2VQ8M6JFE
Affected environment: reported live checkout; local server configuration is PRODUCTION. Please confirm deployed environment and credential/account mapping.
Investigation timestamp: 27 October 2026, 10:57 IST (UTC+05:30).
Actual reproduction timestamp/timezone: [populate from fresh affected session; not yet captured].
Affected merchantOrderId / provider orderId: [not supplied; capture fresh values].
Provider request/correlation IDs and HTTP status: [not yet captured].
Deployed revision: [not supplied].

Reported behavior: mobile checkout offers UPI and launches PhonePe. Desktop hosted checkout shows cards and net banking, but no UPI/QR. Both repository paths use PG_CHECKOUT and direct navigation to the returned redirectUrl.

Sanitized request shape (illustrative values, not a captured live transaction):

```json
{
  "merchantOrderId": "REPLACE_WITH_FRESH_ORDER_ID",
  "amount": 1000,
  "expireAfter": 1200,
  "paymentFlow": {
    "type": "PG_CHECKOUT",
    "merchantUrls": { "redirectUrl": "[redacted merchant return URL]" },
    "paymentModeConfig": {
      "version": "V2",
      "enabledPaymentModes": [
        { "type": "UPI", "flows": ["QR", "INTENT", "COLLECT"] },
        { "type": "CARD", "types": ["CREDIT_CARD", "DEBIT_CARD"] },
        { "type": "NET_BANKING" }
      ]
    }
  },
  "metaInfo": { "udf1": "[redacted]", "udf2": "genz-living-space" }
}
```

Reproduction: create a fresh order via POST /checkout/v2/pay; navigate directly to its returned checkout URL on desktop; record available instruments. Repeat with a new equivalent mobile order. Compare unrestricted versus explicit V2 mode configuration using fresh sandbox orders, without completing a payment. Results of this comparison are pending.

Please confirm whether UPI_QR is enabled and eligible for this merchant's Standard Checkout desktop sessions, whether this account supports paymentModeConfig version V2, and whether any merchant, account, transaction, browser or risk restrictions explain its absence. Please clarify the V1 examples on the general Create Payment page versus the explicit V2 configuration reference, and provide the reason QR was excluded for the supplied fresh order IDs. We have no provider evidence yet that merchant-side QR is disabled.

This draft has not been sent. Fill missing session evidence before sending.
