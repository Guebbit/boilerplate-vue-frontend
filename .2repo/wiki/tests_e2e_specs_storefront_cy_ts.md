# tests/e2e/specs/storefront.cy.ts

## Purpose

Cypress e2e suite that pins the three customer-facing storefront surfaces added by the release: facet chips on the product listing, stock gating + add-to-cart on the product page, and the cancel / buy-again actions on the order page. The assertions are designed so that the *API's own invariants* (public-scope facets, the stock gate, the single order-write) are what the page must honour, rather than hard-coding a specific dataset.

## Key elements

- **`beforeEach`** — Visits `/en` and calls `cy.resetState()` to give each test a clean application state.
- **"catalogue facets" suite** — Fetches the public product list via `cy.publicProducts()`, derives per-category counts locally, then asserts the lowest-count chip renders with that exact number and that clicking it filters the table to exactly that many rows.
- **"product page" suite** — Logs in as `user`, loads a product in the `outOfStock` role via `cy.productInRole`, and asserts the add-to-cart button is disabled and an "Out of stock" message is visible.
- **"order actions" suite** — Logs in as `admin`, loads an order in the `cancellable` role via `cy.orderInRole`, then:
  - Clicks cancel, confirms via the in-app dialog (`[data-test=app-dialog-confirm]`), verifies the "Order cancelled" message appears and the cancel button disappears.
  - Clicks reorder and asserts the cart page loads with at least one cart item.

## Relationships

- **`src/modules/wishlist/tests/e2e/wishlist.cy.ts`** — The file's header comment explicitly notes that wishlist e2e coverage lives with its own module; this file intentionally does *not* cover wishlist behaviour.
- **Custom Cypress commands** (`cy.resetState`, `cy.publicProducts`, `cy.loginAs`, `cy.productInRole`, `cy.orderInRole`) — Defined elsewhere in the test support layer; this file consumes them as the sole data-access mechanism.

## Notes

- Facet counts are **derived at runtime** from `cy.publicProducts()`, not written as constants. This keeps the test dataset-agnostic: the expectation moves with whatever catalogue the backend serves, and a chip showing a count beyond the public list is exactly the leak being caught.
- The cancel confirmation uses the **in-app dialog** (`[data-test=app-dialog-confirm]`), not `window.confirm`. The comment clarifies that Cypress auto-accepts only the browser-level dialog.
- The "cancellable" order role is used as a **precondition proxy**: the UI hides the cancel button for all other statuses, so finding an order in that role is sufficient to guarantee the button will be present.
- Data-testid selectors (`[data-test=…]`) are the primary interaction targets; avoid coupling tests to styling or text where a test-id exists.
