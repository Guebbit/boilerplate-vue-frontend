---
source: scripts/e2e/payment-webhook.ts
sha256: 9d23fc1ced486218da55f1a65893bd7eae85cb7a21537e0ca57740102de013a7
signature: a5d81b078059db345784a48abd70258e346ff704194b7b090b1a003b8f7b54c7
generated_at: 2026-11-10T02:34:40.284889+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/payment-webhook.ts

## Purpose

A pure utility that signs a payment-provider webhook event with HMAC-SHA256 and POSTs it to the backend's `POST /payments/webhook/fake` endpoint. It exists so E2E specs can simulate the provider nudging the server (duplicate events, stale signatures, dispute reports) without duplicating the signing logic, and so the unit suite can exercise the pure functions without a browser.

## Key elements

- **`DEMO_PAYMENT_WEBHOOK_SECRET`** – The shared secret the demo backend uses (`scenarios/run-server.ts`). Override at runtime via `E2E_PAYMENT_WEBHOOK_SECRET`.
- **`PaymentWebhookDispute`** – Interface mirroring the contract's `DisputeReport` (dispute id, kind, status, reason, amount, currency, fundsWithdrawn, evidenceDueBy, observedAt, dashboardUrl).
- **`PaymentWebhookEvent`** – Interface for the provider's event envelope (`id`, optional `providerRef` / `refundRef`, optional `dispute`).
- **`PaymentWebhookRequest`** – Input shape for `postPaymentWebhook`: `apiUrl`, `event`, optional `timestamp`, optional `secret`.
- **`signPaymentWebhook(body, timestamp, secret)`** – Returns the `payment-signature` header value: `t=<unix>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">`.
- **`postPaymentWebhook(request)`** – Serialises the event once, signs those exact bytes, and POSTs. Resolves with the HTTP status code; a 400 refusal is data, not a thrown error.

## Relationships

- **`cypress.config.ts`** – Contains the task wiring that delegates to this module's exports so specs can invoke `postPaymentWebhook` from within the browser context.
- **`tests/e2e/specs/journeys/op41-a-buyer-disputes-the-payment.cy.ts`** – E2E spec that drives a dispute journey; calls `postPaymentWebhook` (via the task) to deliver a `PaymentWebhookEvent` carrying a `dispute` payload.
- **`tests/support/e2e/harness.ts`** – Test harness that supplies the `apiUrl` and orchestrates the sequence of webhook deliveries a spec needs.
- **`tests/unit/scripts/e2e/payment-webhook.spec.ts`** – Unit tests that pin `signPaymentWebhook` output and `postPaymentWebhook` behaviour without a browser (the file is deliberately pure of Cypress for this).

## Notes

- The body is serialised exactly once and those same bytes are both signed and sent. Re-serialising between the two steps would change the payload and invalidate the signature.
- `postPaymentWebhook` returns the status code rather than throwing on 4xx, so specs can assert on refusals (e.g. a stale timestamp) as data.
- The default timestamp is "now" in unix seconds; passing an old value is the intended way to test that the backend rejects stale deliveries.
- The file lives in `scripts/e2e/` (not `tests/support/e2e/`) specifically so the unit suite can import it without pulling in Cypress globals.
