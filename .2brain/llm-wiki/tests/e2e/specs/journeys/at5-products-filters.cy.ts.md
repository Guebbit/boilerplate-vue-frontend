---
source: tests/e2e/specs/journeys/at5-products-filters.cy.ts
sha256: 27f60aafdbda956023d84a4798bc50dc18deb0e8f9ee3f5cb1be137b074fdea2
generated_at: 2026-10-17T02:08:04.845105+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/at5-products-filters.cy.ts

## Purpose
E2e journey test (AT5) that verifies each product-list filter—active/inactive, deleted/not-deleted, exact ID, and min/max price range—correctly narrows the visible rows, and that "reset" restores the original full list. Seeded witness subjects (an inactive product, a soft-deleted product, and a rich-priced product) serve as the positive and negative assertions for every filter.

## Key elements
- **`describe('AT5 · Products list filters')`** – single-suite, single-test file scoped to the staff products page.
- **`beforeEach`** – visits `/en`, restores DB fixtures, logs in as `admin`, enables network tracking, navigates to `/en/products`, and waits for the network to settle.
- **`it('active, deleted, id and price range narrow the list, and reset restores it')`** – the entire journey in one test block; asserts four filter behaviors sequentially, each followed by `resetSearch()` and a `deep.equal` check against the initial `all` list.
- **Filter interactions** – uses `cy.pickOption` for select filters (`[data-test=filter-active]`, `[data-test=filter-deleted]`), `cy.get(...).type()` for text inputs (`[data-test=filter-id]`, `[data-test=filter-min-price]`, `[data-test=filter-max-price]`), and `submitSearch()` to apply.
- **Witness subjects** – `cy.subjectId('product.inactive')`, `'product.softDeleted'`, `'product.rich'`, `'product.inStock'` and `cy.subjectProduct(...)` retrieve seeded data used for assertions.
- **Price-range isolation** – sets both min and max to `rich.price` so only that exact price survives the filter; a differently-priced `product.inStock` is expected to drop out.

## Relationships
- **`tests/support/e2e/steps.ts`** – imports `listedIds` (returns the array of currently visible row IDs), `submitSearch` (triggers the search/filter form submission), and `resetSearch` (clears all filter inputs and reloads the unfiltered list). These three helpers encapsulate the repeated DOM interactions so the spec stays declarative.

## Notes
- The `// requires-module: account, products` comment signals the fixture set this test depends on; running it without those modules will fail in `cy.restore()`.
- The test is intentionally a **single `it`** with sequential filter checks rather than four independent tests—this keeps the reset-and-restore assertion adjacent to each filter it protects, at the cost of a cascading failure if an early filter is broken.
- The "Not deleted" branch also asserts `[data-test=row-deleted]` does not exist, guarding against a UI badge leaking when the filter is active.
- Deep-equal checks after each `resetSearch()` compare against the `all` snapshot captured *before* any filtering, making the test order-sensitive within the block.
