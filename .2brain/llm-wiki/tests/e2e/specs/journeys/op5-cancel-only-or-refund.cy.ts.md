---
source: tests/e2e/specs/journeys/op5-cancel-only-or-refund.cy.ts
sha256: c5cfd95c303d598c9db5035b9eb9c583d780327dfff4792bb09997c662ec5812
generated_at: 2026-10-17T02:21:55.217028+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op5-cancel-only-or-refund.cy.ts

## Purpose

End-to-end test for the operator journey "OP5": verifying that **cancel only** and **cancel and refund** on a paid order are distinct operations. Cancel-only cancels the order and restores stock while leaving the payment captured (so "refund only" remains available afterwards); cancel-and-refund performs both in one press. Also asserts that a credit note is issued for each refund and that shelf stock is restored for both orders.

## Key elements

- **`unitsIn(order)`** – sums `quantity` across an order's `items` array; used to calculate how many units must reappear on the shelf.
- **`PaymentLike`, `OrderLike`, `CreditNoteLike`, `ProductLike`** – narrow structural types describing only the API response fields the test reads (status, amounts, available, grandTotal).
- **`describe('OP5 …')` / single `it`** – the entire test body. Uses nested `cy.subjectId(…).then(…)` chains to resolve seeded fixture IDs (`order.paid`, `order.paidExpress`, `product.rich`) before driving the UI and asserting via `cy.apiAs`.
- **`cy.step(…)`** – human-readable milestone labels logged during execution.
- **`eventually(fn, predicate)`** – polling wrapper (imported from `steps.ts`) used where the backend needs time to settle: payment `displayStatus → 'refunded'` and credit-note list length > 0.

## Relationships

- **`tests/support/e2e/steps.ts`** – imports `eventually`, a polling helper that retries a Cypress command until a predicate is satisfied. Also the source of `cy.subjectId`, `cy.apiAs`, `cy.loginAs`, and `cy.step` (registered as custom commands by the steps module).

## Notes

- **Seeded fixtures required**: `order.paid`, `order.paidExpress`, `product.rich`. The test hard-assumes both orders reference the same product and that the product's `available` count equals the sum of their quantities plus its prior shelf value.
- **Stock assertion sums both orders**: `shelf.units` is the total units across *both* the cancel-only order and the cancel-and-refund order; the final product check expects `available === before + units`. This only works if both orders draw from the same SKU.
- **Button-state invariants**: after cancel-only, `button-cancel-and-refund` is disabled but `button-refund-only` stays enabled; after either path, the action button that was clicked becomes disabled (no double-press).
- **`beforeEach` pattern**: `cy.visit → cy.restore → cy.visit` — restores the DB fixture snapshot between runs.
- **No `async/await`**: all sequencing is via Cypress `.then()` chains, a constraint of the Cypress command queue.
