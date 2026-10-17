---
source: tests/e2e/specs/journeys/in3-an-order-fires-a-signed-webhook.cy.ts
sha256: 8b412cd6469d13e3046bd3c54686761837761e0c85f92244f5a28f27521a0b88
generated_at: 2026-10-17T02:17:18.635114+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/in3-an-order-fires-a-signed-webhook.cy.ts

## Purpose

Cypress end-to-end test for journey **IN3**: after a customer completes a purchase, the order-created webhook is delivered to the receiver with a valid HMAC signature, and the signature continues to verify correctly through a secret rotation (both secrets during overlap, only the new one after the old is deleted). Covers both the **live** profile (broker delivers immediately) and the **demo** profile (admin must click Replay to trigger delivery).

## Key elements

- **`rowOf(deliveryId)`** – Local helper that locates the delivery-log row for a given `deliveryId` via `[data-test=webhook-delivery-replay][aria-label*="…"]` → closest `[data-test=webhook-delivery-row]`.
- **`describe('IN3 …')` / single `it`** – The entire journey in one test:
  1. Customer logs in, adds `product.rich` to cart, checks out with pickup.
  2. Admin finds the new `order.created` delivery row.
  3. **Live profile:** polls until the row status becomes `succeeded` (broker delivered).
     **Demo profile:** asserts `pending`, intercepts the Replay POST, clicks the button, asserts `succeeded`.
  4. Reads the receiver's captured request; asserts exactly one delivery, correct event type, matching `webhook-id` header, and signature verifies under `DEMO_WEBHOOK_SECRET`.
  5. **Rotation step:** admin rotates the secret, replays; asserts the latest delivery verifies under **both** old and new secrets.
  6. **Removal step:** admin deletes the old secret ID, replays; asserts the latest delivery verifies under the **new** secret only.
- **`aboutThisOrder`** – Inline filter over `webhooksReceived(subscription.url)` that narrows captured requests to the specific `orderId`, handling the case where a live tester retains older sessions.

## Relationships

- **`scripts/e2e/webhook-demo-secret.ts`** – Supplies `DEMO_WEBHOOK_SECRET`, the fixed secret seeded on the demo subscription; used as the expected verifying key in all signature assertions.
- **`tests/support/e2e/harness.ts`** – `forgetWebhooks()` clears prior receiver state before the journey; `webhooksReceived(url)` reads what the receiver captured.
- **`tests/support/e2e/integrator.ts`** – Provides the integration-domain helpers: `seededSubscription`, `deliveriesOf`, `newDelivery`, `eventOf`, `latestOf`, and `expectVerifiesUnder` (the HMAC verification assertion).
- **`tests/support/e2e/steps.ts`** – Provides UI steps: `addToCartFromStorefront`, `eventually` (polling utility), `idFromLocation`.

## Notes

- The `beforeEach` performs `cy.visit → cy.restore → cy.visit`. The double visit is intentional: the first establishes cookies/session, `cy.restore` re-seeds the database, the second refreshes against the clean state.
- In the **demo** profile, Replay signs with the secret ring *as it stands at replay time*, which is what lets the rotation steps reuse a single delivery row instead of requiring a second order.
- `rowOf` matches on `aria-label*="${deliveryId}"` (substring). If delivery IDs are prefixes of one another this could match the wrong row; in practice IDs are UUIDs so collisions are unlikely, but it is a latent fragility.
- The file declares `// requires-module: account, cart, orders, products, webhooks` at the top, indicating which backend modules must be enabled for the test to pass.
