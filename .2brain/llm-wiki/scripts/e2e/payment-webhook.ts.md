---
source: scripts/e2e/payment-webhook.ts
sha256: 19ea7274931c93641b0033c8146125d49892a5587dc3372809479b681ff7dba9
generated_at: 2026-10-02T11:35:16.472727+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/payment-webhook.ts

## Purpose

Signs and POSTs a payment-provider webhook to the backend's `POST /payments/webhook` endpoint, mimicking what the real provider would send. This lets E2E specs trigger outcomes the browser cannot produce (late `succeeded`, duplicate event IDs, stale timestamps) by crafting a correctly HMAC-signed request.

## Key elements

- **`DEMO_PAYMENT_WEBHOOK_SECRET`** – the shared secret baked into the demo backend (`scenarios/run-server.ts`); used as a fallback when no environment override is set.
- **`PaymentWebhookEvent`** – the normalised event payload the backend expects (`id`, optional `providerRef`, `status`, `cardLast4`).
- **`PaymentWebhookRequest`** – input shape for `postPaymentWebhook`: `apiUrl`, `event`, optional `timestamp`, optional `secret`.
- **`signPaymentWebhook(body, timestamp, secret)`** – pure function that returns the `x-payment-signature` header value (`t=<ts>,v1=<hex HMAC-SHA256 of "<ts>.<body>">`).
- **`postPaymentWebhook(request)`** – serialises the event once, signs those exact bytes, POSTs to `/payments/webhook`, and resolves with the HTTP status code (no throw on non-2xx).

## Relationships

- **`cypress.config.ts`** – registers a `cy.task` that delegates to `postPaymentWebhook`, making it callable from Cypress specs.
- **`tests/support/e2e/harness.ts`** – E2E harness that invokes this module to simulate provider callbacks during test flows.
- **`tests/unit/scripts/e2e/payment-webhook.spec.ts`** – unit tests that import and pin the signing/POST logic in isolation.
- **`github/workflows/e2e-live.yml`** – CI workflow that runs the live E2E suite in which this module is exercised end-to-end.

## Notes

- The file is intentionally **pure** (no Cypress imports) and lives **outside** `tests/support/e2e/` so the unit suite can import it directly without pulling in the test runner.
- `JSON.stringify` is called **once**; the resulting string is both signed and sent. Re-serialising between the two steps would change the byte stream and invalidate the signature.
- `postPaymentWebhook` resolves with the status code rather than throwing — a `400` (e.g. bad signature, stale timestamp) is returned as data for the spec to assert on.
- Secret resolution order: explicit `request.secret` → `E2E_PAYMENT_WEBHOOK_SECRET` env var → `DEMO_PAYMENT_WEBHOOK_SECRET`.
- The signature format must stay in lock-step with the backend's `payments/providers/webhook-signature.ts`.
