---
source: tests/e2e/specs/journeys/at5-products-filters.cy.ts
sha256: a547859e788e6037bf60b0fda65fd39410d8a45e4e3905364fcb7ce540f9d951
signature: a547859e788e6037bf60b0fda65fd39410d8a45e4e3905364fcb7ce540f9d951
generated_at: 2026-11-10T06:51:38.018653+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/at5-products-filters.cy.ts

## Purpose
E2E test (Cypress) verifying that the staff-facing products list correctly narrows results when the **active/inactive**, **deleted**, **ID**, and **price-range** filters are applied, and that **reset** restores the full list. Seeded witness products (`product.inactive`, `product.softDeleted`, `product.rich`, `product.inStock`) serve as assertions for inclusion/exclusion under each filter state.

## Key elements
- **`beforeEach`** – Restores seed data, logs in as `admin`, enables network tracking, navigates to `/en/products`, and waits for the network to settle.
- **`it('active, deleted, id and price range narrow the list, and reset restores it')`** – Single sequential test exercising all four filters. Uses `listedIds()` to snapshot the full ID list, then asserts inclusion/exclusion after each filter + `submitSearch()` / `resetSearch()` cycle.
- **Filter selectors** – `[data-test=filter-active]`, `[data-test=filter-deleted]`, `[data-test=filter-id] input`, `[data-test=filter-min-price] input`, `[data-test=filter-max-price] input`.
- **Witness subjects** – `product.inactive`, `product.softDeleted`, `product.rich`, `product.inStock` resolved via `cy.subjectId()` / `cy.subjectProduct()`.

## Relationships
- **`tests/support/e2e/steps.ts`** – Imports `listedIds` (returns the array of visible product row IDs), `submitSearch` (triggers the form submission), and `resetSearch` (clears all filter inputs and resubmits). All filter-interaction assertions in this file are built on these three helpers.

## Notes
- The test runs all four filter scenarios in **one** `it` block, sequentially. A failure in an early section (e.g., active filter) still leaves the test in a reset state before the next section, but the test is not split into independent cases.
- Full-list assertions use `should('deep.equal', all)`, requiring **exact** order and membership—fragile if the backend changes row ordering.
- The price-range sanity check asserts `other.price !== rich.price` via a plain `expect` before interacting with the UI; if the seed data ever gives both products the same price, the test will fail at the assertion rather than in the UI.
- The `deleted` section additionally asserts that `[data-test=row-deleted]` is absent when "Not deleted" is selected—a UI-flag check beyond the ID-list assertion.
- The `// requires-module: account, products` comment signals that both the account (login) and products (seed data) modules must be loaded before this spec runs.
