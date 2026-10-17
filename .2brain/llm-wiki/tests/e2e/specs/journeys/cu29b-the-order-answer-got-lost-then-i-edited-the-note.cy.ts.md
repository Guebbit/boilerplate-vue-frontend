---
source: tests/e2e/specs/journeys/cu29b-the-order-answer-got-lost-then-i-edited-the-note.cy.ts
sha256: f8168e85bc79ec19301207ec3c7d231a57067844e44ca245e1c59068c46f954b
generated_at: 2026-10-17T02:13:03.185032+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu29b-the-order-answer-got-lost-then-i-edited-the-note.cy.ts

## Purpose

E2E journey test for scenario CU29b: the first `POST /cart/checkout` succeeds server-side but its response is replaced with a 502 (simulating a lost answer). The customer then edits the order note and retries. The test asserts the page always lands in a coherent state—either the order page or an empty cart—never on a checkout button that can never succeed.

## Key elements

- **`clearOpenOrders()`** — Cancels every `pending` order for the seeded user before the test runs, preventing the second checkout from hitting the per-account open-order cap (a different scenario, CU20).
- **`OrderLike`** — Minimal shape (`id`, `status`) for the order list response.
- **`describe('CU29b …') / it('does not leave the customer pressing a button that can never work')`** — The single test case. Flow:
  1. Logs in, adds a product, selects `pickup` shipping, enables checkout.
  2. Intercepts `POST **/cart/checkout`; on the **first** call only, swaps the real server response to `502` via `request.on('response', …)`.
  3. Asserts the error banner appears, then edits the note textarea and clicks checkout again.
  4. Verifies the second request gets a **different** `Idempotency-Key` (body changed ⇒ new key) and does **not** receive a `422`.
  5. Final assertion: the DOM shows either the order target (`#order-target`) or a cart with zero items.
- **`keys: string[]`** — Collected idempotency-key headers from both intercepted calls, asserted to be length 2 and distinct.

## Relationships

- **`tests/support/e2e/steps.ts`** — Imports `addToCartFromStorefront` to seed a product into the cart from the storefront before exercising the checkout flow.

## Notes

- The 502 swap uses `request.on('response', …)` (Cypress "intercepted responses" API) rather than a static `cy.intercept` reply, so the real server **does** process the first checkout and create the order; only the HTTP status seen by the client is altered. This is the distinction between "request lost" and "request never sent."
- `clearOpenOrders` is a prerequisite, not part of the scenario itself. Without it, the second checkout would be rejected by the order-count cap, masking the actual CU29b behavior.
- The test requires the `account`, `cart`, `inventory`, `orders`, and `products` modules (per the `requires-module` comment); it will fail or misbehave if any are unavailable.
- `cy.restore()` in `beforeEach` resets seeded data between runs; the test does not clean up after itself beyond `clearOpenOrders`.
