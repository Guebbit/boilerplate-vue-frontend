# src/modules/cart/tests/e2e/cart.cy.ts

## Purpose

Cypress end-to-end test suite for the cart page. Covers the full user journey on `/en/cart`: empty-state rendering, item listing, quantity increment/decrement, item removal, full cart clear, and checkout redirect. Exists to guard the cart UI contract against regressions.

## Key elements

- **`readFirstItemQuantity()`** – Helper that locates the first `[data-test=cart-item]`, extracts the numeric value from its "Quantity: N" label, asserts it is a positive integer, and returns it as a number.
- **`describe('Empty cart')`** – Verifies the page title, "Your cart is empty" message, absence of items/summary, and presence of a "Browse products" link.
- **`describe('Cart with items')`** – Verifies item rendering, summary totals, minus/plus quantity buttons (including the disabled-at-1 edge case), per-item removal, "Clear cart", and checkout redirect to `/orders`.

## Relationships

No dependency-graph neighbors are recorded for this file. It relies on globally-registered Cypress custom commands (`cy.resetState`, `cy.loginAs`) and the running application at `/en`.

## Notes

- Selectors are exclusively `data-test` attributes; no coupling to class names or DOM structure beyond those hooks.
- The **Empty cart** `beforeEach` defensively clicks `[data-test=cart-clear]` if items happen to exist, ensuring a clean slate regardless of prior test state.
- The **Cart with items** `beforeEach` waits up to 10 s for at least one `[data-test=cart-item]`, implying the cart is expected to be pre-populated (likely via `cy.resetState` or fixture data).
- The decrease-quantity test branches on whether the initial quantity is 1 to assert the minus button is *disabled* rather than clicking it.
- `readFirstItemQuantity` throws a descriptive error on parse failure and runs a Chai `expect` assertion *inside* the Cypress `then` chain (not in a separate `it`), so a failure surfaces as a test assertion error rather than a silent `undefined`.
