---
source: src/modules/cart/tests/e2e/cart.cy.ts
sha256: 9e55e982cb6c11e71b64b3a6395555f5146f47b9b235126ab6d6633b5ac06f60
signature: 339aec24df179bc862352dfc58389b4a5578a13ed4c9cf1df4f71d3ac9072fde
generated_at: 2026-11-10T04:04:39.671921+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/e2e/cart.cy.ts

## Purpose

Cypress end-to-end test suite for the cart page. It verifies the full cart user journey: rendering an empty state, displaying seeded items, adjusting quantities, removing individual items, clearing the cart (with and without confirmation), and completing a checkout that redirects to an order page.

## Key elements

- **`readFirstItemQuantity()`** — Helper that grabs the first `[data-test=cart-item]`, extracts the numeric value from its `Quantity: N` label via regex, asserts it is a positive integer, and returns it. Used as a baseline before step-increase/decrease assertions.
- **`describe('Cart')`** — Top-level suite; its `beforeEach` visits `/en` and calls `cy.restore()` to reset application state.
- **`describe('Empty cart')`** — Sub-suite that logs in as `user`, ensures the cart is cleared (dismisses a confirm dialog if present), then asserts: page title, "Your cart is empty" message, absence of items/summary, and a "Browse products" link.
- **`describe('Cart with items')`** — Sub-suite whose `beforeEach` populates the cart via `cy.apiAs('user', 'POST', '/cart/items', …)` using two seeded products (`product.inStock` qty 2, `product.rich` qty 1), then visits `/en/cart`. Contains tests for:
  - Item list and summary rendering
  - Decrease button (disabled at qty 1, decrements otherwise)
  - Increase button (increments quantity)
  - Remove-last-item (asserts length drops by one)
  - Clear cart with confirmation (cart becomes empty)
  - Clear cart with cancellation (cart is preserved)
  - Checkout via the `pickup` shipping method → URL matches `/orders/:id`

## Relationships

No graph-neighbor dependencies are recorded for this file.

## Notes

- All selectors are `data-test` attributes; the suite is tightly coupled to those hooks existing in the cart components.
- Cart state is seeded through the API (`cy.apiAs` / `cy.subjectId`) rather than the UI, so tests depend on the seed database having `product.inStock` and `product.rich` records.
- The checkout test explicitly selects the `pickup` shipping method because it bypasses address requirements; switching to a different shipping method would break the assertion that `[data-test=cart-checkout]` is enabled.
- `cy.restore()` is called in the top-level `beforeEach`, not per sub-suite—any test that mutates global state outside the cart (e.g., dialog state) relies on this reset.
- The quantity helper throws a descriptive `Error` (rather than using a Chai assertion) on parse failure, which means a malformed label surfaces as a test crash rather than a clean assertion diff.
