# Fresh desktop/mobile evidence — no payment completion

> Historical inspection. See [payment-flow-fixes.md](payment-flow-fixes.md) for implemented corrections and the current deployment/log checklist.

## Enablement and scope

Local `.env` now has PHONEPE_DIAGNOSTICS="true". Confirmed using Next.js's @next/env loader without displaying secrets. The configured environment remains PRODUCTION; credentials and payment modes were preserved. This file is gitignored. Restart the local Next.js server so the new code/settings are loaded. For the deployed site, deploy this code and separately set PHONEPE_DIAGNOSTICS=true in that server's environment, then restart/redeploy. A local .env edit cannot enable remote logs. A process-level environment override takes precedence over .env: confirm actual diagnostic lines appear.

No checkout was initiated during this inspection. Use confirmed sandbox credentials and test database/bookings for controlled comparisons. Do not simply change PHONEPE_ENV while keeping production credentials. Opening the existing booking/rent checkout creates database payment records (and a DUE invoice for rent) even if no payment is completed. Use test bookings; avoid repeating monthly-rent initiation on a live resident for this experiment.

## Exact capture procedure

1. Use the same application revision, same payment flow (initial booking versus balance versus rent), same amount/currency and equivalent booking conditions on desktop and a real mobile browser. Use a fresh checkout for each device; do not reuse or copy a session across devices. Record the time, including IST (UTC+05:30), and browser/OS versions. Test promptly within the booking hold; the current 15-minute hold is shorter than the 20-minute gateway expiry.
2. Desktop: open DevTools before clicking checkout; enable Preserve log for Console and Network. Mobile: use remote browser debugging if available; otherwise capture visible payment options and obtain server logs using the matching order ID.
3. Start checkout once. From the application's create-order response (or monthly-rent response), copy only merchantOrderId, orderId, paymentAmount and HTTP status. Do not copy the response's redirectUrl or a full HAR. The browser only sees the application request; the OAuth and /checkout/v2/pay calls happen on the server.
4. From the server terminal/runtime logs, copy the complete one-line JSON records prefixed `PhonePe diagnostic` for this merchantOrderId:
   - checkout.request: timestamp, environment, endpoint, merchantOrderId, amountPaise, expireAfterSeconds, fields, paymentFlowFields, full paymentModeConfig and metaInfoKeys.
   - api.response: HTTP status, merchantOrderId, requestId and correlationId (null means provider did not supply those headers).
   - checkout.created: merchantOrderId, provider orderId, state and expireAt.
   - api.error or oauth.error, if present: HTTP status and provider code. An OAuth error can occur before a checkout.request record exists; use its timestamp to correlate.
5. On the hosted PhonePe page, record whether UPI, QR, cards and net banking appear. Capture a screenshot with address bar/session URL hidden, personal details redacted, and any QR itself covered. On mobile, record whether UPI is offered; app launch is optional evidence and is not needed to complete this comparison.
6. Record console errors and failed Network rows as request hostname + pathname (no query), method, HTTP status and redacted error text. Do not copy headers/cookies/request bodies/URL queries. If no errors occur, explicitly record 'none observed'. Record whether the page itself failed to load versus loaded without QR.
7. Stop at the payment-method screen. Do not scan the QR, enter card details/OTP/UPI PIN, approve a collect request or authorize anything in an app. Close/cancel the checkout. Record the closing time. No completed-payment callback is expected merely from opening the page.
8. Repeat once on the other device using a newly created order/session. Confirm both server request records have the same environment, amount, paymentFlowFields and paymentModeConfig. Their order IDs must differ.
9. Disable diagnostics after collection: PHONEPE_DIAGNOSTICS=false and restart/redeploy. Keep evidence with restricted access; share only the sanitized subset below.

Do not manually open /payment/return as proof of payment. That page triggers status reconciliation and is not needed for visibility evidence. Do not call arbitrary status routes or send simulated webhooks to a live database for this test.

## Fill this in for each device

| Evidence | Desktop | Mobile |
| --- | --- | --- |
| Application revision / site hostname | | |
| Timestamp + timezone | | |
| Environment from server log | | |
| Browser + version / OS + version | | |
| Flow: booking / balance / rent | | |
| merchantOrderId | | |
| PhonePe orderId | | |
| Expected INR amount / amountPaise sent | | |
| create-order HTTP status | | |
| PhonePe create HTTP status | | |
| Provider requestId / correlationId | | |
| Provider state / expireAt | | |
| UPI shown? QR shown? | | |
| Cards shown? Net banking shown? | | |
| Full sanitized diagnostic lines | | |
| Redacted screenshot | | |
| Console errors / failed request paths + status | | |
| Closed without authorizing: time | | |

The smallest useful evidence is these two fresh order IDs, matching checkout.request/api.response/checkout.created records and screenshots of available instruments. No customer details, credentials, tokens or full session URLs are needed.

## Flow checked

Browser sends bookingId (plus requested amount for a balance payment) to the authenticated create-order route. Initial booking pricing comes from the database; balance requests are bounded by the outstanding balance. The route converts INR rupees to integer paise, creates a local PENDING Payment and generates merchantOrderId. Monthly rent uses server-calculated base rent plus maintenance, creates a DUE Invoice and PENDING Payment, then uses the same gateway helper.

The helper obtains/caches OAuth using client_id/client_secret/client_version, serializes merchantOrderId, amount, expireAfter=1200, paymentFlow.type=PG_CHECKOUT, merchantUrls.redirectUrl, V2 paymentModeConfig and udf metadata, and directly POSTs to /checkout/v2/pay. There is no SDK transformation. Full booking metadata (including guestEmail on the local payment record) is not sent: only udf1/udf2 are sent in these routes. PhonePe's returned provider orderId is initially stored in gatewayPaymentId; after verification it may be replaced by the transactionId. The browser navigates directly to redirectUrl.

PhonePe creates actual transaction attempt details when a payment attempt occurs. The local PENDING Payment is an order-tracking record, not evidence of money received. Return-page polling consults the server status route; authenticated webhooks also reconcile. Redirects alone do not mark an order paid. The status query details=false is documented to return the latest attempt, so it is not inherently a defect.

## Confirmed gaps to correct separately, in priority order

These are code findings; they are not proof of why PhonePe hides QR. This turn enables/improves diagnostics and audits the flow; it does not change settlement behavior.

1. **Hold/session conflict and unsafe release.** `src/app/api/bookings/route.ts:234` creates a 15-minute hold; `src/lib/phonepe.ts` sends 1200 seconds (20 minutes), even later retries create another full-length session. `src/lib/booking-cleanup.ts:50,130` releases holds for provider PENDING and after provider-check errors. A still-payable session may outlive bed allocation. Align expiry to the remaining hold and preserve/retry uncertain or pending gateway states; reconcile all payable attempts before release.
2. **Amounts and authentication.** `src/app/api/payments/status/route.ts:84` credits COMPLETED without checking provider amount against the payment's expected paise. `src/app/api/payments/webhook/route.ts:74` accepts missing/zero amounts and small mismatches. `src/lib/phonepe.ts` has fallback SHA credentials and a nonstandard HMAC-labeled hash; webhook route accepts unauthenticated development requests. Require verified webhook configuration and exact expected amounts before crediting. Confirm provider HMAC algorithm/encoding before implementing it.
3. **Duplicate/racing attempts and failure events.** Each retry creates another payable order; no unique constraint exists on Payment.gatewayOrderId. Monthly rent creates another DUE invoice for the same cycle on each initiation. Status/webhook use stale booking totals, so two separately valid completed attempts can overwrite totals; a delayed failed webhook unconditionally overwrites a previously completed payment. Use cycle/attempt idempotency, monotonic state transitions and database-safe accumulation/reconciliation.
4. **Background reconciliation incomplete.** `src/app/api/cron/reconcile-payments/route.ts:60` only counts completed recent payments. Persist confirmation through a shared reconciler rather than relying on the customer returning. Cleanup's separate implementation also sets the entire booking paid and lacks status/webhook's atomic PENDING guard; unify it to avoid partial-payment/race discrepancies.
5. **Initiation failure and provider timeout.** Both initiation routes write PENDING before the gateway request; rent also writes DUE before the call. Errors leave these records behind. Distinguish definite rejection from uncertain timeout, persist attempt outcomes, reuse the cycle invoice and look up provider status before another payable retry. Do not blindly mark timeouts failed, since the provider may already have created a session.
6. **Status access and state handling.** `src/app/api/payments/status/route.ts` imports getSessionUser but never enforces ownership, returns booking identifiers, and treats every non-COMPLETED/non-PENDING provider state as FAILED. Restrict customer access appropriately while keeping server reconciliation separate; handle only documented terminal failures as failures and preserve unexpected states for investigation.
7. **Configuration/data clarity.** Missing or misspelled PHONEPE_ENV silently selects sandbox; validate explicit environments. Validate the production return origin and merchant credential ownership. Separate provider order ID from provider transaction ID instead of overwriting gatewayPaymentId. The development status simulator returns COMPLETED without a real payment when credentials are absent; use only an isolated test database and explicit simulator mode.

The gateway payload itself needs no speculative field replacement. Remaining QR-specific blockers are deployed payload evidence, actual hosted session comparison and provider confirmation of merchant/account eligibility if QR remains absent. The unrestricted-versus-explicit comparison requires a sandbox-only harness and confirmed sandbox credentials; the production request has not been changed to omit restrictions.
