---
source: tests/e2e/specs/journeys/cu29-the-order-answer-got-lost.cy.ts
sha256: 42894de63242f147a30658fb48060898e72de021564c1bb2ec32abfb251da9f0
signature: e9b96ab59ffe7fc6ca69fd46cf9251c3d548de09e8288f75adf1b52646c25790
generated_at: 2026-11-10T06:59:01.630703+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu29-the-order-answer-got-lost.cy.ts

## Purpose

End-to-end test for use case CU29: the server successfully places an order but the response is lost in transit (replaced by a 502). Verifies that the customer can press "Place order" again and the API, honoring the `Idempotency-Key`, returns the *first* order instead of creating a duplicate. The test asserts order count, request identity (key + body), and cart consumption via API reads, not UI state.

## Key elements

- **`OrdersPage`** (local interface) — shape of the paginated `GET /orders` response used for counting.
- **`orderCount()`** (local helper) — calls `GET /orders?pageSize=1` as the logged-in user and returns `meta.totalItems` as a `Cypress.Chainable<number>`.
- **`describe` / `it` block** — single test that:
  1. Logs in, adds a product to cart, selects `pickup` shipping, and records the pre-existing order count.
  2. Intercepts `POST **/cart/checkout` to let the real request through, then swaps the first response to a 502 (simulating a lost answer).
  3. Asserts the UI shows the checkout error, but the API count incremented by one.
  4. Clicks checkout a second time, asserts the order detail page appears, the count did *not* increment further, and both intercepted requests carried the identical `Idempotency-Key` and body.
  5. Confirms the cart is empty both in the DOM and via `GET /cart`.
- **`beforeEach`** — visits the site, calls `cy.restore()` (seeds a clean state), and re-visits.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports `addToCartFromStorefront` to populate the cart from the storefront in one step, avoiding a manual add-to-cart flow.

## Notes

- The intercept deliberately uses the `response` event handler (`request.on('response', …)`) rather than `cy.intercept`'s static reply, so the real backend *does* process the request before the status is swapped. This is what makes "applied, then lost" a faithful simulation.
- Idempotency is verified by comparing the two intercepted requests' `Idempotency-Key` header and JSON body via `deep.equal`, not by any UI indicator.
- The test requires the modules `account`, `cart`, `inventory`, `orders`, and `products` (declared in the top comment as `requires-module`).
- `pickup` shipping is chosen specifically because it needs no address entry, keeping the checkout button enabled without extra form steps.
- No payment / card budget is involved; the test exercises the order-placement idempotency path only.
