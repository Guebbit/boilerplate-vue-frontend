---
source: src/modules/cart/tests/e2e/cart.cy.ts
sha256: d8f2083b91ddc2ed85ad84836bddd9b9a54e07515d782a8b77098372b0c390bb
generated_at: 2026-10-02T15:01:47.019218+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/e2e/cart.cy.ts

## Purpose

Cypress end-to-end test suite for the cart page, covering the full user flow: viewing an empty cart, incrementing/decrementing quantities, removing individual items, clearing the cart (with confirm and decline paths), and completing a checkout that redirects to the new order.

## Key elements

- **`readFirstItemQuantity`** — Module-level helper. Locates the first `[data-test=cart-item]`, extracts the `Quantity: N` label via regex, asserts N is a positive integer, and returns the parsed number. Used by the increase/decrease tests to assert relative quantity changes.
- **`describe('Cart')` > `beforeEach`** — Visits `/en` and calls `cy.restore()` to reset to seeded state before every test.
- **`describe('Empty cart')`** — Sub-suite that (in its own `beforeEach`) logs in as admin, navigates to `/en/cart`, conditionally clears any residual items, and asserts the "Your cart is empty" state. Tests: page title present, no items/summary rendered, "Browse products" link visible.
- **`describe('Cart with items')`** — Sub-suite whose `beforeEach` logs in, visits the cart, and waits (10 s timeout) for at least one `[data-test=cart-item]`. Tests:
  - Items and summary (Items/Total labels) are displayed.
  - Minus button decreases quantity (or is disabled at 1).
  - Plus button increases quantity.
  - "Remove" button removes the last item.
  - "Clear cart" + confirm empties the cart.
  - "Clear cart" + cancel preserves items.
  - Checkout with pickup shipping method redirects to `/orders/:id`.

## Relationships

No graph neighbors are recorded for this file. It is a leaf test file with no outbound imports (Cypress globals are provided by the runtime) and no inbound imports from other source modules.

## Notes

- **Seeded data dependency.** The "Cart with items" suite relies on `cy.restore()` seeding a cart that already contains at least one item; the 10 s timeout in `beforeEach` masks flakiness if seeding is slow. The "Empty cart" suite defensively clears the cart in its setup to guard against residual state.
- **Custom commands.** `cy.loginAs('admin')` and `cy.restore()` are project-level Cypress commands defined elsewhere in the repo, not standard API calls.
- **Checkout test assumption.** The comment notes that pickup is chosen because it requires no shipping address, while the seeded cart holds physical goods that must still be fulfilled. If the seeded cart changes to virtual-only items, the test rationale shifts.
- **Selectors.** All queries use `data-test` attributes; the suite is tightly coupled to those hook names existing in the cart component markup.
