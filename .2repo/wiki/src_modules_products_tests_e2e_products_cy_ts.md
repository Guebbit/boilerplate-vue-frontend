# src/modules/products/tests/e2e/products.cy.ts

## Purpose

Cypress E2E suite that exercises the products **list** and **detail** pages in a real browser against a seeded backend. It verifies what anonymous vs. admin users see (including soft-deleted and inactive products), that the public list matches the API's public scope, that row actions are role-gated, and that the detail page renders the fields the API returned.

## Key elements

- **`PAGE_ONE_SIZE` (10)** – constant capping row-count and iteration assertions to a single rendered page; a paginated list can only ever show this many rows.
- **`describe('Products list')`** – all list-page tests:
  - Title/table presence.
  - "Transition" tests: create → confirm visible → soft-delete or deactivate → confirm gone (one independent case per flag).
  - Row-count parity with `cy.publicProducts()`, clamped to `PAGE_ONE_SIZE`.
  - Title + price rendering per row (addressed by title, not index).
  - Create-button and row-action visibility split by admin vs. anonymous.
  - Admin still sees soft-deleted and inactive rows.
  - Clicking **View** navigates to `/products/:id` (id read off the DOM row to avoid sort-tie fragility).
- **`describe('Product detail')`** – detail-page tests using a `rich` fixture (guarantees description + price):
  - Page exists, title / price / description displayed, back-link present.
- **Custom Cypress commands relied on** (defined elsewhere): `cy.resetState`, `cy.createProduct`, `cy.softDeleteProduct`, `cy.deactivateProduct`, `cy.publicProducts`, `cy.loginAs`, `cy.productInRole`.

## Relationships

No graph neighbors are recorded for this file. It implicitly depends on the custom command layer (listed above) and the seeded backend API, but no sibling source files are tracked in the dependency graph.

## Notes

- **Transition over tableau.** Visibility rules are tested by mutating state mid-test (create → hide → reload) rather than asserting on a pre-seeded hidden row, so a passing test actually proves the filter logic rather than "the row was never there."
- **Independent flags, independent cases.** `deletedAt` and `active` are separate test cases; a combined assertion would go red without identifying which filter caused it.
- **Only page 1 is asserted.** Comparing against the full catalogue would fail the moment it exceeds one page regardless of pagination correctness.
- **Title-addressed, not index-addressed.** The API sorts by `createdAt DESC, _id DESC`; seeded rows can share a millisecond, so row order is a fixture-timing artifact, not behaviour under test.
- **Synchronous DOM read before click.** The View-navigation test reads the product id inside a single `.then(($row) => …)` to avoid re-entering the Cypress chain (`.eq(0)` on a stale jQuery element throws).
- **`rich` fixture for detail.** Chosen specifically because it guarantees non-empty `description` and `price`; an `inStock` fixture could have an empty description and make the assertion vacuous.
