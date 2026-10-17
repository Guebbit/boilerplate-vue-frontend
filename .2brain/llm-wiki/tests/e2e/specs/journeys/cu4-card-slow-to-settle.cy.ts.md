---
source: tests/e2e/specs/journeys/cu4-card-slow-to-settle.cy.ts
sha256: a35185e96c27230796f1c566059f15c11cfddfec94159f007e2613d2d4809a5e
generated_at: 2026-10-17T02:13:34.351985+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu4-card-slow-to-settle.cy.ts

## Purpose

Cypress E2E journey test for the "slow card settle" scenario (CU4). Verifies that when a card payment is in a `processing` state, the UI honestly shows a waiting state (no invoice, no re-charge form) with a single **Finish** button to re-poll the provider. Covers two endings: the provider eventually confirms the payment, or the customer cancels and the system auto-refunds.

## Key elements

- **`payWithSlowCard(): Cypress.Chainable<string>`** — Shared checkout helper: logs in as `user`, adds `product.rich` to cart, selects `pickup` shipping, checks out, and submits the method labelled *"Method that settles later"*. Returns the order ID parsed from the URL.
- **`OrderLike`** — Minimal `{ status: string }` shape used for API assertions on the order.
- **`PaymentLike`** — Minimal `{ displayStatus?, status, amount, amountRefunded }` shape used for API assertions on the payment.
- **Test 1 – "waits honestly…order is paid once Finish reads its answer"** — Asserts the processing UI (Finish button visible, card form absent, no invoice, order `pending`), then clicks Finish and asserts the payment becomes `succeeded` and the order becomes `paid`.
- **Test 2 – "refunds the payment…never keeps it"** — After the same setup, clicks Cancel, confirms the dialog, then polls (via `eventually`) until the payment is `refunded` with `amountRefunded === amount`. Asserts the order stays `cancelled` and the UI shows "Refunded" with no Finish button or invoice.

## Relationships

- **`tests/support/e2e/steps.ts`** — Imports three utilities:
  - `addToCartFromStorefront('product.rich')` — seeds a cart item from the storefront.
  - `eventually(fn, predicate)` — retries an async check until the predicate passes (used to poll the refund).
  - `idFromLocation()` — extracts the order ID from the current URL.

## Notes

- The `// requires-module:` comment at the top lists the backend modules that must be seeded (`account, cart, delivery, inventory, orders, payments, products`).
- Shipping method is `pickup` specifically to avoid the address step and keep the helper short.
- The refund assertion uses `eventually` because the cancel-triggered refund is asynchronous on the backend; a single `cy.apiAs` call may not yet reflect the settled state.
- `beforeEach` calls `cy.restore()` between the two tests to reset the seeded database so each scenario starts from a clean slate.
