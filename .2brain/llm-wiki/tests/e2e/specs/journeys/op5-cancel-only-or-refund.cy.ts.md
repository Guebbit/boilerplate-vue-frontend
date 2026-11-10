---
source: tests/e2e/specs/journeys/op5-cancel-only-or-refund.cy.ts
sha256: 8c79df0da0afb0fe6e32baf60662a22e52fbe35ff92d4508d43913f7f7bb9df2
signature: aa43440e7065057bf9c2c532919145cb1d1081e1882a341752802685868b048e
generated_at: 2026-11-10T07:19:40.097882+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op5-cancel-only-or-refund.cy.ts

## Purpose

End-to-end test verifying that "cancel only" and "cancel and refund" are two distinct, correctly sequenced operations on a paid order. Cancel only frees stock and marks the order canceled while leaving the payment captured (refund still available); cancel and refund performs both in one action and issues a credit note. Two seeded paid orders exercise each branch, with stock, payment status, credit notes, and customer email all asserted.

## Key elements

- **`PaymentLike` / `OrderLike` / `ProductLike`** – minimal structural types for the API payloads this test reads (payment status & refund amount, order status & item quantities, product `available` count).
- **`unitsIn(order)`** – sums `quantity` across an order's line items; used to calculate total stock that should return to the shelf.
- **`beforeEach`** – visits `/en`, calls `cy.restore()` to reset the seeded database, then revisits.
- **Single `it` block** – walks through the full story: cancel-only → verify payment untouched → refund-only → verify payment settled; then on a second order: cancel-and-refund → verify both at once. Also asserts credit-note count, outbound customer emails, and final shelf stock.
- **Button-state assertions** – after cancel-only, the "cancel and refund" button is disabled; after each action the acting button itself is disabled, preventing double-clicks.

## Relationships

- **`tests/support/e2e/steps.ts`** – provides the four helpers this file imports:
  - `creditNotesOf` – fetches credit notes for an order (asserted: exactly one per refund).
  - `eventually` – polls an async payment lookup until the refund status lands (used for the cancel-and-refund branch).
  - `orderMailTo` – asserts a specific outbound email to the customer for cancellation and for refund.
  - `paymentOfOrder` – retrieves the payment object attached to a given order.

## Notes

- The test relies on three seed subjects (`order.paid`, `order.paidExpress`, `product.rich`) resolved via `cy.subjectId`. If seeds change, IDs and expected stock math break silently.
- Payment after cancel-and-refund is checked with `eventually` (async settlement), whereas the refund-only step after cancel-only uses a synchronous `.should()`. This implies the combined action may settle the refund asynchronously while the explicit refund-only path settles synchronously.
- Stock is read through the admin API (`GET /products/:id`), not the UI, so the test does not exercise any client-side stock display logic.
- The `requires-module` pragma at the top (`account, inventory, orders, payments, products`) must be satisfied by the environment or the test will skip/fail at the infrastructure level.
