---
source: tests/e2e/specs/journeys/cu20-too-many-unpaid-orders.cy.ts
sha256: f0fc7663c6edd97f1ba4a8a1fec5a87850a9a8761934692781218aca9da93587
generated_at: 2026-10-17T02:11:17.291743+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu20-too-many-unpaid-orders.cy.ts

## Purpose

E2E journey test for **CU20 – Too many unpaid orders**. Verifies that the shop caps open (pending) orders per account at two, regardless of payment method: a third order is refused with a specific sentence listing the existing unpaid orders (not a generic error), the cart items survive, cancelling frees a slot, paying reduces the open count, and a new transfer order is accepted again.

## Key elements

- **`openOrders()`** – API helper (`cy.apiAs('user', 'GET', '/orders?pageSize=100')`) that returns a `Cypress.Chainable<number>` of the user's orders with `status === 'pending'`.
- **`putInCart()`** – Visits `/en/products` fresh and calls `addToCartFromStorefront('product.rich')`; the fresh visit avoids a stale category-chip toggle.
- **`checkoutWith(method)`** – Combines `putInCart`, navigates to cart, selects **pickup** shipping and the given payment radio (`card` | `bank_transfer`), then clicks checkout.
- **`describe('CU20 · Too many unpaid orders', …)`** – Single test case that walks through: initial open count → second order (transfer) → third order refused (transfer, then card) → cancel one → same basket goes through by card → pay → open count drops → new transfer accepted.
- **`OrderLike` / `OrdersPage`** – Minimal TypeScript interfaces for the `/orders` list response shape.

## Relationships

- **`tests/support/e2e/steps.ts`** – Imports `addToCartFromStorefront` (adds a product to the cart via the storefront UI) and `idFromLocation` (extracts the order id from the post-checkout URL). Also relies on `cy.apiAs`, `cy.visit`, `cy.goToCart`, `cy.loginAs`, `cy.restore`, and `cy.payWith` commands defined in the support layer.

## Notes

- `beforeEach` calls `cy.restore()` (state reset) between the initial visit and the real test start; the seeded user begins with exactly **one** pending order.
- Payment-method radios must be clicked on the **`<label>`** element, not the wrapper carrying `data-test`; the comment explains the wrapper's clickable centre may be empty space.
- The file header's `requires-module` comment lists all backend modules the test touches: account, cart, inventory, orders, payments, products.
- Spending one card confirmation (`cy.payWith('Card that pays')`) is a deliberate one-time side effect on the `user` account's test data.
- The cap check uses `pageSize=100` to avoid pagination edge-cases when counting pending orders.
