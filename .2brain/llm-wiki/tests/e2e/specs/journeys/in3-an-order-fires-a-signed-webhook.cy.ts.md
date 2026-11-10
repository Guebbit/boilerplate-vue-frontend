---
source: tests/e2e/specs/journeys/in3-an-order-fires-a-signed-webhook.cy.ts
sha256: e7c33ee974c926d14d4952d3e4157f4aa5cd9b8f29a88ae0b49bc20054f5e8fe
signature: 980df20c940b688c26d8abf0b099b5c7382d5e94fb005982a4f449cf8179c80b
generated_at: 2026-11-10T07:09:01.019074+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/in3-an-order-fires-a-signed-webhook.cy.ts

## Purpose

End-to-end Cypress journey verifying that placing a storefront order fires an `order.created` webhook whose payload is cryptographically signed under the subscription's secret. It also exercises secret rotation: after the admin adds a new secret, a replayed delivery verifies under both; after the old secret is deleted, only the new one verifies.

## Key elements

- **`rowOf(deliveryId)`** — helper that locates the delivery-log row (and its Replay button) for a given `deliveryId` via `[data-test=webhook-delivery-replay]`.
- **`describe('IN3 · …')` / single `it`** — the sole test. Steps, in order:
  1. Seed a subscription, snapshot existing deliveries.
  2. Log in as a customer, add `product.rich` to cart, checkout with pickup.
  3. Assert a new `order.created` delivery row appears in the admin delivery log.
  4. **Profile branch:** Live → wait for `succeeded` status (broker delivered). Demo → assert `pending`, run `cy.runJob('sweep-webhook-retries')`, then assert `succeeded`.
  5. Assert the receiver captured exactly one request for this order; header `webhook-id` matches `delivery.eventId`; `expectVerifiesUnder` confirms the signature under `DEMO_WEBHOOK_SECRET`.
  6. **Rotation overlap:** POST a new secret (expects `whsec_` prefix), replay the delivery, assert the latest received request verifies under **both** old and new secrets.
  7. **Old removed:** DELETE the original secret, replay again, assert the latest request does **not** verify under the old secret but **does** under the new one.

## Relationships

- **`scripts/e2e/webhook-demo-secret.ts`** — exports `DEMO_WEBHOOK_SECRET`, the fixed demo secret used as the expected signing key in every `expectVerifiesUnder` assertion.
- **`tests/support/e2e/harness.ts`** — provides `forgetWebhooks` (resets captured webhooks before the test) and `webhooksReceived(url)` (fetches what the receiver captured).
- **`tests/support/e2e/integrator.ts`** — provides the webhook-domain helpers: `seededSubscription`, `deliveriesOf`, `newDelivery` (finds the row added since the snapshot), `eventOf` (extracts order/event from a captured request), `latestOf`, and `expectVerifiesUnder` (HMAC check against one or more secrets).
- **`tests/support/e2e/steps.ts`** — provides storefront/checkout primitives (`addToCartFromStorefront`, `idFromLocation`) and the `eventually` polling utility used to wait for asynchronous delivery and capture steps.

## Notes

- **Two profiles, one story.** The test branches on `cy.env('liveProfile')`. In **demo** mode there is no broker; the delivery stays `pending` until `cy.runJob('sweep-webhook-retries')` is invoked, which triggers the retry sweep that actually sends the request to a Cypress-hosted listener. In **live** mode the broker delivers immediately to a `webhook-tester` and the test only reads the result.
- **Replay signs with the current ring.** Because a replay re-signs with whichever secrets are active *at replay time*, the rotation steps need no second order — they simply replay the same delivery.
- The top-of-file `requires-module` comment lists the backend modules (`account, cart, orders, products, webhooks`) that must be present for the test to pass.
- `beforeEach` calls `cy.restore()` between two `cy.visit('/en')` calls, which resets seeded data between test runs.
