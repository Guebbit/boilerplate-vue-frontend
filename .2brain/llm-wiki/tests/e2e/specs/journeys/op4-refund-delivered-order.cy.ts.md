---
source: tests/e2e/specs/journeys/op4-refund-delivered-order.cy.ts
sha256: 45f6961bebc8cfa6335925554276e9a1e47800000cc60537225cc1881b085130
generated_at: 2026-10-17T02:21:42.323679+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op4-refund-delivered-order.cy.ts

## Purpose

End-to-end Cypress test for operation **OP4**: a moderator refunds a *delivered* order. Verifies that the refund returns the money (payment status → `refunded`, `amountRefunded` = full amount), the order status stays `delivered` (neither cancel button was available), a credit note is issued, and the customer sees the refund and credit note on their own order page.

## Key elements

- **`PaymentLike`** – minimal interface (`status`, `displayStatus`, `amount`, `amountRefunded`) for the payment API assertions.
- **`OrderLike`** – minimal interface (`status`) for the order API assertion.
- **`CreditNoteLike`** – minimal interface (`grandTotal`) for the credit-note list assertion.
- **`describe('OP4 · A return: refund a delivered order')`** – single spec suite; one `it` block drives the full journey.
- **`beforeEach`** – restores fixture state (`cy.restore()`) and re-`visit`s the app so each run starts clean.
- **Test flow (4 `cy.step` blocks):**
  1. *Button state on edit page* – `button-refund-only` enabled; `button-cancel-only` and `button-cancel-and-refund` disabled. Payment API confirms `succeeded` / `amountRefunded === 0`.
  2. *Click refund-only* – no error appears, button disables, payment API shows `displayStatus === 'refunded'` and full `amountRefunded`.
  3. *Order unchanged + credit note* – order API still `delivered`; `eventually` polls `/orders/:id/credit-notes` until ≥ 1 note, then asserts exactly 1.
  4. *Customer view* – `cy.switchUser('user')`, visits order page, asserts `payment-status` contains "Refunded", fulfillment-status element exists, and one `order-credit-note-row`.

## Relationships

- **`tests/support/e2e/steps.ts`** – imports `eventually`, a polling helper that repeatedly invokes a Cypress request until a predicate passes. Used here to wait for the credit note to appear before asserting its count.

## Notes

- `cy.subjectId('order.delivered')` is a custom command that resolves a pre-seeded fixture order by name; the test depends on that fixture existing.
- `cy.restore()` in `beforeEach` resets the database/app state to its initial snapshot – without it the refund from a prior run would break the "amountRefunded === 0" precondition.
- The credit-note check deliberately uses `eventually` rather than a plain `cy.request` because the note is created asynchronously by the backend after the refund call.
- `cy.switchUser('user')` swaps the auth context mid-test to simulate the customer perspective without a separate browser context.
- The header comment `requires-module: account, orders, payments` is a convention indicating which backend modules must be active for this spec to run.
