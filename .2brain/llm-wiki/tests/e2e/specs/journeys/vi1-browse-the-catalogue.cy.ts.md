---
source: tests/e2e/specs/journeys/vi1-browse-the-catalogue.cy.ts
sha256: 2a7852dfc04b802e9f75379c8e1443537863485061853c65636a200261fbaa3b
generated_at: 2026-10-17T02:22:45.438611+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/vi1-browse-the-catalogue.cy.ts

## Purpose

Cypress end-to-end journey test (VI1) that exercises the guest product-catalogue browsing flow: filtering by a dynamic tag and a computed price band, sorting by price and name, changing page size, verifying that the URL preserves and restores the full view state (reload, browser back, fresh visit), confirming reset clears everything, and ending with a nonsense search that surfaces the empty-state UI. All expected values are derived at runtime from the live public product list, so the test adapts to seed changes without hard-coding product names, tags, or prices.

## Key elements

- **`pickTag(products)`** — Selects a tag that appears on ≥ 4 products but not all, ranked by frequency. Returns the tag name and the subset of products carrying it. Fails the test if no such tag exists.
- **`shownPrices()`** / **`shownTitles()`** — Chainable helpers that read the price (in cents via `cents()`) or title text from the currently rendered product cards, in screen order.
- **`chooseOption(select, position)`** — Clicks the *n*-th option in a Vuetify `v-select` overlay by index, since options carry no `data-test` attributes.
- **`settled()`** — Waits for the intercepted `@catalogue` POST and for `aria-busy` to clear, ensuring the next assertion reads the post-filter grid.
- **`beforeEach`** — Visits `/en/products`, restores fixtures, intercepts `POST **/products/search` as `@catalogue`, and waits for the initial list render.
- **The single `it` block** — The full story: tag filter → price band → card content checks → sort assertions → URL-state round-trips (reload, back, fresh visit) → Reset → page-size change → pagination → empty-state search.
- **`Listed` interface** — Local shape (`title`, `price`, `tags?`) describing the slice of product data this test reads from `cy.publicProducts()`.
- **Constants** — `DEFAULT_PAGE_SIZE` (10) and `LARGE_PAGE_SIZE` (25), matching the storefront's select options.

## Relationships

- **`tests/support/e2e/steps.ts`** — Direct import: provides the `cents()` utility (parsing a display string to integer cents) and the `cy.step()` command used for narrative narration. The `cents` function originates in `scripts/e2e/cents.ts` and is re-exported through `steps.ts`.
- **`scripts/e2e/cents.ts`** — Indirect dependency via the re-export in `steps.ts`; supplies the price-parsing logic used by `shownPrices()` and the price-band arithmetic inside the test body.
- **`cy.publicProducts()`** — A custom Cypress command (from the `products` module) that returns the full public catalogue as JSON. The test calls it multiple times to compute expected tag counts, price bounds, and total page sizes.

## Notes

- **Tag selection is dynamic but constrained**: `pickTag` requires a tag with 4 ≤ count < total. If the seed data shifts so no tag satisfies this, the test fails at the `expect(tag, …)` assertion — a deliberate signal that the fixture needs a "popular but not universal" tag.
- **Price band is computed from the *filtered* set** (products carrying the chosen tag), not the whole catalogue. The band excludes the cheapest and dearest item in that subset, guaranteeing both edges are cut. If the subset has fewer than 3 products the band collapses; the test guards this with the `inBand.length > 0` assertion.
- **`chooseOption` is positional, not label-based**: the sort-select order is assumed to be `[newest, price↑, price↓, name A-Z, name Z-A]`. Reordering the select options in the storefront will silently break indices 2 and 3.
- **`settled()` is mandatory after every filter/sort/page change** — assertions without it race against the in-flight `POST /products/search`.
- **The `v-select` interaction clicks `.v-overlay-container .v-list-item`**, which is Vuetify's internal overlay structure. A Vuetify major upgrade that changes the overlay DOM will break `chooseOption`.
- **URL is treated as the single source of truth** for view state. After every user action the test asserts the relevant query-param (`tag=`, `minPrice=`, `sort=`, `pageSize=`, `page=`) is present, and the "fresh visit" step re-uses the exact `location('href')` captured mid-story.
