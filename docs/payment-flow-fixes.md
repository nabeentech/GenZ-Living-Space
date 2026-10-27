# Payment flow fixes and deployment evidence

This document supersedes the unchanged-findings lists in the earlier investigation/checklist. Checkout instruments remain the existing PhonePe paymentModeConfig V2: UPI QR/INTENT/COLLECT, credit/debit cards, and net banking. No production payment or live gateway request was made during implementation.

## Changes

- Initial checkout uses the remaining 15-minute booking hold, minus a 60-second network buffer, rather than starting another 20-minute session. PhonePe's minimum is 300 seconds; initiation is rejected when less than six minutes remain. OAuth is obtained before calculating expiry. Rent/balance checkouts without an inventory hold keep the existing 1200-second session.
- Cleanup checks all gateway attempts for an expired hold. A provider timeout, PENDING, unknown state, invalid/mismatching payment, missing credentials or review-required payment retains the reservation. Availability, walk-in, extension and booking conflict queries continue to block unresolved PAYMENT_PENDING reservations even when the original hold timestamp has passed. Only safe cancellation releases them.
- Status, webhook, cron and cleanup share a serializable database reconciler. Money is credited only after an authenticated provider status call reports COMPLETED and exact integer paise match the expected payment. An included completed attempt must also match. Persisted provider order IDs are checked. Invoice, payment, booking, bed and audit updates commit together.
- Duplicate completion does not double-credit; a late failure cannot downgrade completion. Separate concurrent attempts read current totals inside the transaction. Captured excess, cancelled-booking captures and conflicting rent cycles become REVIEW_REQUIRED for manual handling rather than silently discarding money or reclaiming a bed. CHECKED_IN is preserved on balance payment. Invoice debt is allocated across outstanding invoices.
- SHA webhook authentication requires explicitly configured username/password and the documented SHA256(username:password) hash. There are no hardcoded defaults or development bypass. The incorrect HMAC-labeled raw hash is removed; HMAC mode fails closed pending a provider algorithm/encoding test vector. An authenticated webhook triggers a fresh provider status lookup; webhook body state alone never settles a booking. Missing/zero/wrong amounts are rejected, and provider failures return HTTP 503 for retry.
- Browser status verification requires the payment owner. The legacy verify endpoint calls the same authenticated helper directly instead of dropping the session in a server-to-server HTTP request.
- Cron actually persists reconciliation, rather than merely counting completed provider orders. It polls unresolved orders regardless of age and revisits recent legacy failures. It requires CRON_SECRET. The existing vercel.json schedule remains every five minutes; verify that the deployed scheduler is active and authorized.
- A guarded initiation transaction blocks overlapping unresolved attempts, validates the current booking/cycle and generates UUID-based merchantOrderIds. Rent retries reuse a matching unpaid cycle invoice. Confirmed pre-dispatch errors mark the attempt FAILED with initiationRejected; errors after dispatch retain PENDING because the provider might have accepted the order. No automatic paid simulator remains when credentials are absent. Refunds also fail rather than simulating success with absent credentials.
- Diagnostics now include amount, expiry, provider order ID, provider status and reconciliation outcomes, while excluding credentials, customer values, authorization headers and complete checkout/return URLs. Raw provider error bodies are not logged.

## Deployment requirements

No database schema migration is required: current string statuses and payment metadata store the additional reconciliation information. REVIEW_REQUIRED is an intentional operator queue; it must not be manually changed to paid without investigating the provider order and reservation. Never retry an uncertain captured payment by creating another payable session.

Before deployment configure:

- PHONEPE_ENV=PRODUCTION explicitly, with the matching production client ID/secret/version. No secret values should be sent to this chat.
- PHONEPE_WEBHOOK_AUTH_MODE=SHA, PHONEPE_WEBHOOK_USERNAME and PHONEPE_WEBHOOK_PASSWORD, matching the SHA webhook configured in the PhonePe dashboard. Subscribe to checkout.order.completed and checkout.order.failed at `/api/payments/webhook`. A deployment currently configured for HMAC must be changed to the supported SHA setup before these changes go live; do not rely on the old incorrect hash.
- CRON_SECRET: a strong random server-side secret. Ensure the scheduled call to `/api/cron/reconcile-payments` includes `Authorization: Bearer <CRON_SECRET>`. Without it the endpoint returns 503; incorrect authorization returns 401. The existing five-minute schedule needs to actually run on the hosting platform.
- APP_BASE_URL (or NEXT_PUBLIC_APP_URL) must be the canonical HTTPS application hostname so checkout returns to the same site/session.
- PHONEPE_DIAGNOSTICS=true temporarily in the deployed server environment. Deploy code and restart; local .env does not configure the deployed server. Set false and restart after collecting evidence.

A provider outage deliberately retains reservations and can temporarily reduce availability. Investigate retained holds rather than manually releasing one while its gateway order remains payable. Legacy uncertain attempts may block new checkout until reconciled. REVIEW_REQUIRED records need support to decide the correct refund/booking action; there is no automatic refund.

## Exact production logs to provide after deployment

First send the deployed revision/build ID, deployment timestamp including timezone, and whether the SHA webhook and authorized five-minute cron are configured (yes/no only, never their secrets).

For the desktop QR comparison, open one fresh desktop and one fresh actual-mobile checkout on separate equivalent bookings, using the same flow/amount and the same application revision. Opening checkout creates a pending order, so use merchant-approved test bookings. Stop at payment-method selection and close without scanning a QR, submitting card/OTP/UPI PIN or authorizing any app/collect request. Do not reuse a checkout session across devices.

For each session send complete log lines prefixed `PhonePe diagnostic` for the corresponding merchantOrderId:

1. `payment.initiated`: merchantOrderId, amountPaise, and holdExpiresAt (booking) or flow (rent).
2. `checkout.request`: environment, endpoint, amountPaise, expireAfterSeconds, fields, paymentFlowFields and full paymentModeConfig. Its timestamp is UTC. Compare it with the hold deadline: initial checkout should expire before that hold ends.
3. `api.response` for createPayment: HTTP status, merchantOrderId, requestId/correlationId if present.
4. `checkout.created`: PhonePe orderId, state, expireAt.
5. If opening fails: `oauth.error`, `api.error`, `checkout.initiation_failed` and any `checkout.failed` entries at the same time. NOT_SENT and UNCERTAIN have different meanings; report which one appears.

Also send the browser/OS versions, time with timezone, amount, whether UPI/QR/cards/net banking appear, and a screenshot of the method list with personal data, the address bar and QR content redacted. For browser errors send only redacted error text plus failed request hostname/path and HTTP status, never query strings or headers.

After the session expires, send matching `order.status`, `reconciliation.result`, `hold.retained` or `hold.released` entries and one `cron.result` summary. A retained hold with PENDING/provider-error status is intentional. If cron responds 401/503, send the HTTP status and response message only. A checkout that is only opened may generate no webhook at all; absence of webhook.received is not proof of a problem.

For real payments that happen naturally in normal customer traffic later (do not create one for this test), provide matching `webhook.received`, `reconciliation.result` and provider order/transaction reference IDs if diagnosing settlement. Include `webhook.rejected`, `webhook.retry`, `reconciliation.rejected` or REVIEW_REQUIRED results when present. Do not send raw webhook payloads or authentication/signature headers.

Do not send .env, client secrets, access tokens, cookies, full checkout URLs, complete HARs, customer details or QR content. Only the prefixed sanitized records and the selected browser evidence are needed.

## Validation

- `node --import tsx --test tests/phonepe.test.ts tests/payment-flow.test.ts`: 21 tests pass (gateway mocked; synthetic SQLite fixtures). Covered exact checkout methods and redaction in sandbox/production endpoint selection, hold boundaries, missing/exact amounts, duplicate/concurrent settlement, late failure/capture, partial payments, monthly rent, actual background persistence, provider-outage retention, all-attempt cleanup, initiation failure classification, webhook rejection/retry and owner-only status.
- The Windows Prisma binary-engine transport stalled on this host. Database integration tests use the same installed Prisma version and generated model with its in-process SQLite library engine. Fixtures are generated from Prisma's data model into a new temporary database; repository/live databases are not opened. This verifies transaction behavior, not production engine startup or hosted gateway behavior.
- `npx tsc --noEmit --incremental false`: passed.
- Turbopack compile-only build failed in its CSS worker startup both inside and outside sandbox. `npm run build -- --webpack --experimental-build-mode compile` passed outside sandbox. This is a compile-only check, not a finalized deployment or hosted checkout verification. No production gateway credentials were used for compilation.
- `npm run lint` is still blocked by the existing removed `next lint` script; lint-stack migration is outside this payment change.

Official references:

- https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/create-payment
- https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/create-payment/configure-payment-modes
- https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/order-status
- https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/webhook
