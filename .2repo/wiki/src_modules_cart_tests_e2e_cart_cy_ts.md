# src/modules/cart/tests/e2e/cart.cy.ts

## Purpose

Cypress E2E test suite for the cart page. It verifies the full user-visible behaviour of the cart: empty-state rendering, item listing, quantity increment/decrement, item removal, cart clearing, and checkout redirect to the orders list.

## Key elements

- **`readFirstItemQuantity`** – module-level helper that grabs the first `[data-test=cart-item]`, extracts the numeric quantity from its `Quantity: N` label, asserts it is a positive integer, and returns it.
- **`describe('Cart')`** – top-level suite. `beforeEach` visits `/en` and calls `cy.resetState()` to start from a known state.
- **`describe('Empty cart')`** – suite that logs in as `admin`, visits `/en/cart`, conditionally clicks the clear button if one is present, and asserts the empty-state UI (title, "Your cart is empty" message, no items/summary, "Browse products" link).
- **`describe('Cart with items')`** – suite that assumes at least one cart item exists after reset. Covers:
  - Item presence and summary (Items / Total labels).
  - Decrease button: verifies disabled state at quantity 1, otherwise clicks minus and confirms the new quantity.
  - Increase button: clicks plus and confirms the new quantity.
  - Remove: clicks `[data-test=cart-remove]` on the last item and asserts count decreased by one.
  - Clear cart: clicks `[data-test=cart-clear]` and asserts the empty message.
  - Checkout: clicks `[data-test=cart-checkout]` and asserts URL contains `/orders` and `#orders-list-page` exists.

## Relationships

No graph neighbours are recorded for this file. It depends at runtime on the application under test (cart page, orders list page) and on two custom Cypress commands defined elsewhere: `cy.loginAs` and `cy.resetState`.

## Notes

- All selectors use `data-test` attributes (e.g. `cart-item`, `cart-increase`, `cart-decrease`, `cart-remove`, `cart-clear`, `cart-checkout`). New DOM changes must keep these attributes stable for the tests to pass.
- The "Cart with items" `beforeEach` does **not** add items explicitly; it relies on `cy.resetState()` (custom command) to restore a fixture state that already contains at least one cart line. If that assumption breaks, every test in that block fails at the `beforeEach` guard.
- The empty-cart `beforeEach` conditionally clears the cart *if* a clear button is already visible, guarding against leftover state leaking in from a previous test's checkout.
- Quantity assertions are string-based (`contains('Quantity: N')`) rather than reading a dedicated attribute, so the rendered label format is a de facto contract.
