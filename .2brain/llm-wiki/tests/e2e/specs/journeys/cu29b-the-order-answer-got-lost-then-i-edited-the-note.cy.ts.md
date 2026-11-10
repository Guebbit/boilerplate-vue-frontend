---
source: tests/e2e/specs/journeys/cu29b-the-order-answer-got-lost-then-i-edited-the-note.cy.ts
sha256: f8168e85bc79ec19301207ec3c7d231a57067844e44ca245e1c59068c46f954b
signature: 182558a87d047df50bdaa28c46203a3658f719faa655db78f05bc4b3ab3310e9
generated_at: 2026-11-10T06:59:22.461296+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu29b-the-order-answer-got-lost-then-i-edited-the-note.cy.ts

## Purpose

E2E test for journey CU29b: the customer's first `POST /cart/checkout` succeeds server-side but the response is replaced by a 502, so the UI shows an error. The customer then edits the order note and re-submits. The test asserts that (1) the second request carries a **different** `Idempotency-Key` (a reused key with a changed body would yield 422), (2) the response is not a 422, and (3) the page settles on either the existing order or an empty cart — never on a checkout button that can never succeed.

## Key elements

- **`OrderLike`** — minimal `{ id, status }` shape used to read paginated orders from the API.
- **`clearOpenOrders()`** — helper that lists the seeded user's orders (`GET /orders?pageSize=100`) and cancels every `pending` one. Prevents the second checkout from hitting the per-account open-order cap (CU20) instead of the intended "basket already gone" path.
- **`describe('CU29b · Lost answer, then a different note')`** — the spec block. `beforeEach` restores DB state via `cy.restore()` and visits the storefront.
- **Test: "does not leave the customer pressing a button that can never work"** —
  1. Logs in as `user`, clears open orders, adds an item to cart via the support step, selects pickup shipping.
  2. Installs a `cy.intercept` on `POST **/cart/checkout` that records every `idempotency-key` header and, on the **first** call, swaps the server's real response to `502` (via `request.on('response', …)`) so the UI sees an error while the order was actually created.
  3. Clicks checkout, waits, asserts the error banner appears.
  4. Types a note (`cart-notes`) and clicks checkout again; asserts the second response is **not** 422 and that two distinct idempotency keys were sent.
  5. Asserts the page shows `#order-target` (the order exists) **or** zero `[data-test=cart-item]` elements (cart empty) — one of the two valid end-states.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports `addToCartFromStorefront` and calls it with the product slug `'product.rich'` to place an item in the cart through the storefront UI before navigating to the cart page.

## Notes

- The `// requires-module:` header comment lists the backend modules this test touches: **account, cart, inventory, orders, products**. CI should gate the spec on all five.
- The 502 is injected **after** the server has already processed the request (`request.on('response', …)` per the Cypress intercept docs). This is what makes it "applied, then lost" rather than a pure client-side failure.
- Idempotency-key assertion: the test collects keys into a local `keys[]` array and, in a follow-up `cy.then`, checks length is 2 and the two values differ. It does **not** assert a specific key format.
- `clearOpenOrders` is a local const, not exported. It runs inside the test body (not `beforeEach`) so the order state is known at the point of checkout.
