---
source: tests/e2e/specs/journeys/fr1-double-click-place-order.cy.ts
sha256: f5031535af76bbea4de4688686c14b1ad7e7e656e6890787f8ca5c022a42155c
generated_at: 2026-10-17T02:15:01.690794+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr1-double-click-place-order.cy.ts

## Purpose

End-to-end test for feature requirement 1: a customer double-clicks the "Place order" button on a slow connection and exactly one order is created. The test verifies the button is disabled while the first request is in flight and that any duplicate request carries the same `Idempotency-Key`, so the API deduplicates rather than creating a second order.

## Key elements

- **`CHECKOUT_DELAY_MS`** (const, 1500) — the artificial delay injected into the checkout response via `cy.intercept` so the in-flight/disabled state is observable by the test.
- **`OrdersPage`** (interface) — shape of the paginated orders list response (`items`, `meta.totalItems`).
- **`orderCount()`** (function) — issues `GET /orders?pageSize=1` as the logged-in user and returns a `Cypress.Chainable<number>` yielding the `totalItems` count.
- **`describe('FR1 · Double-click "Place order"')`** — the spec block. `beforeEach` visits the storefront, restores a snapshot, and revisits.
- **`it('places one order, disables the button while waiting, and sends one idempotency key')`** — the single scenario: logs in, adds `product.rich` to cart, selects pickup shipping, intercepts `POST **/cart/checkout` to capture idempotency keys and add delay, double-clicks checkout, asserts button disabled state, verifies all keys are identical, and confirms exactly one new order via `orderCount()`.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports `addToCartFromStorefront` to add a product to the cart from the storefront page. This is the only cross-file import.

## Notes

- The file header declares required backend modules: `account`, `cart`, `inventory`, `orders`, `products`.
- `beforeEach` calls `cy.visit('/en')` → `cy.restore()` → `cy.visit('/en')` again, a snapshot/restore pattern provided by a custom command (not visible in this file).
- Shipping method is set to **pickup** specifically because it requires no address, which is the minimal action to enable the checkout button.
- The `orders` object (`{ before: 0 }`) is used to capture the pre-checkout count outside the Cypress chain, then compared after the response lands.
- The intercept captures `idempotency-key` from request headers; the test asserts all captured keys are non-empty and identical (single `Set` entry).
- No payment is made; the test stops at order creation.
