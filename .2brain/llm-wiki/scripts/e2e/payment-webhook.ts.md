---
source: scripts/e2e/payment-webhook.ts
sha256: d0469cb18cd65413fd286650199afee8fabb64d76b4cf899fbdf304c1ff6d78c
generated_at: 2026-10-17T00:00:45.694307+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/payment-webhook.ts

## Purpose

Utility for signing and POSTing a payment-provider webhook to the backend's `POST /payments/webhook` endpoint, replicating the provider's HMAC authentication. Exists so e2e specs can trigger webhook deliveries (including edge cases like duplicate event IDs or stale signatures) without depending on a real provider. Deliberately kept pure of Cypress so it can be unit-tested in isolation.

## Key elements

- **`DEMO_PAYMENT_WEBHOOK_SECRET`** – Default signing secret matching the demo backend; overridden in production via `E2E_PAYMENT_WEBHOOK_SECRET`.
- **`PaymentWebhookEvent`** – Thin event contract (`id` + optional `providerRef`); carries no outcome, the server queries the provider.
- **`PaymentWebhookRequest`** – Input shape for `postPaymentWebhook`: `apiUrl`, `event`, optional `timestamp` (unix seconds), optional `secret`.
- **`signPaymentWebhook(body, timestamp, secret)`** – Returns the `x-payment-signature` header value: `t=<ts>,v1=<hex HMAC-SHA256 of "<ts>.<body>">`.
- **`postPaymentWebhook(request)`** – Serialises the event once, signs those exact bytes, POSTs to `/payments/webhook`, resolves with the HTTP status code (a 400 is a valid refusal, not a throw).

## Relationships

- **`cypress.config.ts`** – Registers the `cy.task` that delegates to this file, so specs call it via `cy.task` rather than importing it directly.
- **`tests/support/e2e/harness.ts`** – The e2e harness that invokes `postPaymentWebhook` (or the task wrapping it) to simulate provider deliveries during scenarios.
- **`tests/unit/scripts/e2e/payment-webhook.spec.ts`** – Unit suite that pins `signPaymentWebhook` and `postPaymentWebhook` behavior without a browser or live server.
- **`github/workflows/e2e-live.yml`** – CI workflow that runs the live e2e suite, where this module's output is exercised against a real (or demo) backend.

## Notes

- The body is serialised **once**; the same string bytes are both HMAC'd and sent. Re-serialising between the two would change the bytes and invalidate the signature.
- `timestamp` defaults to `Math.floor(Date.now() / 1000)`; passing a past value is the intended way to test stale-signature rejection.
- `secret` resolution order: `request.secret` → `process.env.E2E_PAYMENT_WEBHOOK_SECRET` → `DEMO_PAYMENT_WEBHOOK_SECRET`.
- A 400 response is returned as a status code (data), not thrown—callers must interpret it.
- The file lives in `scripts/e2e/` (not `tests/support/e2e/`) specifically to stay importable by the unit suite without pulling in Cypress globals.
