---
source: tests/e2e/specs/journeys/cu20-too-many-unpaid-orders.cy.ts
sha256: 0844bebfcdcfcd3dbaa0e658a92f14eba4d40063129739972b5dda9498f34dd6
signature: 6a765237694f53925f7546042055a72c1d6a0048ae28bfcefacc0e9f8bd03061
generated_at: 2026-11-10T06:56:52.349309+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu20-too-many-unpaid-orders.cy.ts

## Purpose

E2E test for use case CU20: the shop enforces a per-account cap on open (pending) orders, defaulting to two. This spec verifies that a third order is refused with a human-readable message listing each open order (rather than a generic error), that the refusal is identical for bank transfer and card, that the cart survives the refusal, and that cancelling one open order frees a slot so the same basket can then complete and be paid.

## Key elements

- **`openOrders()`** — calls `GET /orders?pageSize=100` as `user` and returns a chainable count of items whose `status` is `"pending"`.
- **`putInCart()`** — visits `/en/products` and adds `product.rich` via the storefront helper.
- **`checkoutWith(method)`** — combines `putInCart()`, navigates to the cart, selects **Pickup** shipping, selects the given payment-method radio (`card` or `bank_transfer`), and clicks checkout.
- **`OrderLike` / `OrdersPage`** — minimal structural types for the orders API response (`status` string; paginated `items` array).
- **`describe('CU20 …')` / single `it`** — one long happy-and-rejection journey: seed → 2nd order → 3rd refused (transfer) → 3rd refused (card) → cancel one → 3rd succeeds (card) → pay → 4th (transfer) accepted again.

## Relationships

- **`tests/support/e2e/steps.ts`** — provides `addToCartFromStorefront` (used in `putInCart`) and `idFromLocation` (extracts the newly-created order id from the URL after a successful checkout).

## Notes

- The `requires-module` header comment lists the backend modules this journey touches (`account, cart, inventory, orders, payments, products`); a runner may gate on those services being available.
- Payment-method radio clicks target the inner `<label>` element rather than the `data-test` wrapper, because the wrapper's geometric centre can land on empty space (see inline comment).
- `cy.restore()` in `beforeEach` resets the database so the seeded state (one existing pending order) is deterministic.
- The test spends one card confirmation (`cy.payWith('Card that pays')`); the module docblock flags this so test-ordering tools can account for it.
- `idFromLocation()` is called immediately after the second (bank-transfer) order's `#order-target` appears, capturing the order id needed later for the cancel step.
