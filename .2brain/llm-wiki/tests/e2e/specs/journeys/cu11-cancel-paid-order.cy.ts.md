---
source: tests/e2e/specs/journeys/cu11-cancel-paid-order.cy.ts
sha256: 676048025f56f181c8fa17d2cf843b1eef31bafb79bb3273ef7ef3498508b3f5
signature: 492e8688c8a4fc59a8e48430aa32c39aa163e5ccf045a8ff8f45d3578ab10b3e
generated_at: 2026-11-10T06:54:22.433217+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu11-cancel-paid-order.cy.ts

## Purpose

Cypress E2E test for the CU11 journey: a customer cancels a paid, not-yet-dispatched order and verifies the three downstream effects — full card refund, inventory restoration, and credit-note issuance. It also confirms the buyer receives two emails (cancellation and refund) and that the order page reflects the new state.

## Key elements

- **`PaymentLike`** – interface narrowing a payment to `displayStatus`, `status`, `amount`, `amountRefunded` for assertion use.
- **`OrderLike`** – interface narrowing an order to `status` and `items[].quantity`.
- **`unitsAvailable(productId)`** – helper that calls the admin API `GET /products/:id` and extracts `available` as a number; needed because the shopper product page only shows an in-stock flag, never the count.
- **`describe` / `it` block** – single test that walks through: reading pre-state → confirming the cancel dialog (and verifying a declined dialog changes nothing) → asserting `canceled` status → polling for `refunded` payment → verifying two emails → asserting stock increased by the ordered quantity → asserting a credit note exists and is downloadable.
- **`beforeEach`** – restores a clean DB snapshot, visits `/en`, then restores again to ensure a stable starting page.

## Relationships

- **`tests/support/e2e/steps.ts`** — source of all four imported helpers: `creditNotesOf` (polls for credit notes against an order), `eventually` (polls a function until a predicate passes, used for the async refund), `orderMailTo` (asserts a specific email arrived for an order), `paymentOfOrder` (fetches the payment linked to an order). The test relies entirely on these for cross-module reads; no other file is imported.

## Notes

- The refund and credit note are written *after* the cancel request returns, so both are read with polling (`eventually` for the refund, `.should()` on `creditNotesOf` for the note) rather than a single immediate assertion.
- `cy.subjectId('order.paid')` and `cy.subjectId('product.rich')` resolve seeded fixture IDs; the test never creates its own order or product.
- The cancel flow is exercised twice: first the dialog is opened and *declined* (verifying no state change), then opened and *confirmed*. Both use the same `[data-test=order-cancel]` trigger.
- The `requires-module` comment at the top lists the backend modules the test depends on: `account`, `inventory`, `orders`, `payments`, `products`.
