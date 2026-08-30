# tests/e2e/specs/storefront.cy.ts

## Purpose

Cypress e2e spec covering the three storefront surfaces added in the customer release: catalogue facet chips, product-page stock gate and add-to-cart, and order-page cancel / buy-again. Its role is to pin the *frontend* honouring invariants the API already enforces (public-scope facets, the stock gate, the single order write), rather than re-testing backend logic.

## Key elements

- **`describe('Storefront')`** — top-level suite; `beforeEach` visits `/en` and calls `cy.resetState()`.
- **`describe('catalogue facets')`** — single test that derives category→count map from `cy.publicProducts()`, picks the smallest-count category, asserts the chip label matches, clicks it, and verifies the table row count equals the derived number.
- **`describe('product page')`** — two tests:
  - *Out-of-stock:* logs in as `user`, navigates to a `productInRole('outOfStock')`, asserts the add-to-cart button is disabled and the "Out of stock" text is present.
  - *In-stock add:* clicks add-to-cart on a `productInRole('inStock')` product, asserts the success toast.
- **`describe('order actions')`** — single test: logs in as `admin`, navigates to `orderInRole('cancellable')`, cancels via the app-internal dialog confirm, asserts the cancel button disappears, then clicks reorder and asserts the cart page renders with ≥ 1 item.

## Relationships

No graph-neighbor files are recorded for this spec. (The wishlist e2e tests that were previously part of the storefront scope now live in `src/modules/wishlist/tests/e2e/wishlist.cy.ts` — see the header comment.)

## Notes

- **Dynamic facet counts.** The chip-count expectation is computed at runtime from `cy.publicProducts()` rather than hard-coded. This makes the assertion dataset-independent: a chip showing `pets (4)` when the guest can only see 2 is the exact leak being caught, and the test passes/fails with whatever the current public list returns.
- **Custom Cypress commands.** The file relies on project-level extensions — `cy.resetState()`, `cy.publicProducts()`, `cy.loginAs(role)`, `cy.productInRole(role)`, `cy.orderInRole(role)` — that are defined in a separate support file. Understanding their selectors and fixtures is a prerequisite for modifying this spec.
- **App-internal dialog, not `window.confirm`.** The cancel test clicks `[data-test=app-dialog-confirm]` explicitly; Cypress only auto-accepts *browser* dialogs, so the app's own confirm button must be targeted.
- **`toSorted` (non-mutating).** The facet test uses `.toSorted()` to pick the smallest-count category without mutating the entries array.
- **Role-as-precondition.** `productInRole('cancellable')` / `productInRole('outOfStock')` / `productInRole('inStock')` encode the precondition in the selector rather than in a separate setup step — the returned entity is guaranteed to satisfy the invariant under test.
