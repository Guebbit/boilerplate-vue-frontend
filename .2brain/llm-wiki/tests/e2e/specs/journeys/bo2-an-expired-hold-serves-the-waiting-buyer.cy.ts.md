---
source: tests/e2e/specs/journeys/bo2-an-expired-hold-serves-the-waiting-buyer.cy.ts
sha256: 9e1dd24dfb5d4deb758e9e8e391041af0d5bc4dd9104f125fba8119e98b2be6c
signature: f1a70e6fbfbfc9b3947847efe7922211d04a1846158882999c1f10a5dfa49ec5
generated_at: 2026-11-10T06:53:20.659018+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/bo2-an-expired-hold-serves-the-waiting-buyer.cy.ts

## Purpose

End-to-end Cypress test for the BO2 business journey: when a cart hold on the last in-stock unit expires, the freed unit must be allocated to the buyer who already paid for a backorder (oldest payment first), not to the next random shopper. The scenario exercises product creation, cart holds, backorder, payment, hold expiry via clock-jump, and the reservation-sweep job.

## Key elements

- **`HOUR_MS`** – Constant (3 600 000 ms) used to compute the `cy.travel()` duration for simulating hold expiry.
- **`unique()`** – Returns a `Date.now()`-plus-random string; appended to product titles so parallel runs against the same backend don't collide.
- **`OrderLike`** – Minimal interface (`{ id }`) for the order object returned by checkout.
- **`DeliveryLike`** – Minimal interface (`{ items: { status, holdReason? }[] }`) for the fulfillment-orders response used in the assertion.
- **`describe` block** – The test suite. `beforeEach` calls `cy.skipUnlessDemo()`, visits `/en`, runs `cy.restore()`, then revisits.
- **`it` – "hands the freed unit to the buyer who paid, oldest payment first"** – The single test case. Sequence:
  1. Create a product (price 19.90, backorder enabled, backorderLimit 1, qty 1 in stock).
  2. "user" adds the last unit to cart, picks pickup, checks out (no payment) → creates a hold.
  3. "admin" backorders the same product, checks out, then pays with cash → creates a waiting claim.
  4. `cy.travel(24 * HOUR_MS)` simulates hold expiry; `cy.runJob('sweep-reservations')` triggers the cleanup.
  5. Asserts (via `eventually` polling) that the admin's fulfillment order now has items and none remain `on_hold`.

## Relationships

- **`tests/support/e2e/steps.ts`** – Source of the two imported helpers:
  - `checkoutAs<T>(role)` – drives the checkout flow for a given role and returns the typed order object.
  - `eventually(fn, predicate)` – retries `fn` until `predicate` returns true, used to poll the fulfillment-orders endpoint until the hold is released.

## Notes

- **Demo-gated:** The whole suite is skipped unless `cy.skipUnlessDemo()` passes; it relies on `cy.travel()` and `cy.runJob()` which are demo-environment commands, not available in production-like test envs.
- **Not yet browser-verified:** The file header explicitly states it was written against the live pages but has not been run in a browser; selectors or timing may need adjustment on first run.
- **Module dependency:** The leading comment lists required backend modules (`account`, `cart`, `inventory`, `orders`, `products`)—all must be running for the API calls to succeed.
- **Single-unit constraint:** The scenario only works because the product has exactly 1 unit in stock and a backorder limit of 1, making the "last unit" unambiguous.
