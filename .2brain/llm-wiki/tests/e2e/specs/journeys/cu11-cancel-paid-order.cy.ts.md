---
source: tests/e2e/specs/journeys/cu11-cancel-paid-order.cy.ts
sha256: 865b7555e099b3feaa75d92673aa9b362a894fb7fefd613867b5885d8f7c3dd0
generated_at: 2026-10-17T02:09:28.525313+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu11-cancel-paid-order.cy.ts

## Purpose

E2E journey test for **CU11**: a customer cancels a paid (not yet dispatched) order and verifies the three consequences — full card refund, inventory units returned to the shelf, and a credit note issued against the invoice. It also asserts that declining the confirmation dialog leaves the order untouched.

## Key elements

- **`PaymentLike`** — minimal payment shape (`displayStatus`, `status`, `amount`, `amountRefunded`) read to verify the refund.
- **`OrderLike`** — minimal order shape (`status`, `items[].quantity`) used to confirm order state and compute unit count.
- **`CreditNoteLike`** — minimal credit-note shape (`grandTotal`) confirming a note exists.
- **`unitsAvailable(productId)`** — helper that reads the admin product endpoint and returns the `available` count as a `Cypress.Chainable<number>`.
- **`describe('CU11 …')`** — single test that:
  1. Reads the pre-cancellation shelf count and order item quantities.
  2. Clicks cancel, *declines* the dialog, and asserts the order is still `paid`.
  3. Clicks cancel, *confirms*, and asserts the order is `cancelled`.
  4. Polls the payment until `displayStatus === 'refunded'` and `amountRefunded === amount`.
  5. Asserts admin `available` equals pre-count + ordered units; product page still shows "In stock".
  6. Polls the credit-notes endpoint until one entry appears; order page shows the credit-note row with an enabled download button.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports `eventually`, a retry/poll helper used to wait for the async refund landing and the credit note being written (both happen off the cancel request's critical path).

## Notes

- No cancellation email is asserted; per the module doc-block, a customer-initiated cancel sends none (only system expiries in `orders/services/cancel.ts` do).
- Inventory counts are read via the **admin** API because the shopper's product page exposes only in-stock flags, not numeric stock.
- The test relies on seeded subjects (`order.paid`, `product.rich`) via `cy.subjectId`, so it consumes no card budget.
- `beforeEach` restores fixtures and revisits `/en` to get a clean session for every run.
