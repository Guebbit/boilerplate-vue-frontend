---
source: tests/e2e/specs/journeys/vi1-browse-the-catalogue.cy.ts
sha256: 94d008c45542225d1c144aea5a354563c19e7bd0fc4acbac140959e2c1d3037b
signature: cc617a18a87944d18b5bf011cc35aa154deb3cd248004db732661f1c910cf597
generated_at: 2026-11-10T07:22:04.242033+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/vi1-browse-the-catalogue.cy.ts

## Purpose

Cypress journey test (VI1) that drives a guest user through the full catalogue-browsing workflow—filtering by tag and price band, sorting, paginating, verifying URL-as-state (reload, back, shared link), resetting, and reaching the empty state. All expectations are derived at runtime from `cy.publicProducts()` so the test stays valid as seed data changes; no product, tag, or price is hardcoded.

## Key elements

- **`DEFAULT_PAGE_SIZE` / `LARGE_PAGE_SIZE`** — constants (10 and 25) matching the storefront's page-size select options.
- **`Listed`** — minimal product shape (`title`, `price`, `tags?`) read off the public API list.
- **`pickTag(products)`** — selects a tag present on ≥ 4 products but not all, most-populated first; returns the tag and the products carrying it.
- **`shownPrices()` / `shownTitles()`** — DOM readers that return the currently visible cards' prices (in cents, via `cents()`) and titles in screen order.
- **`chooseOption(select, position)`** — clicks a `v-select` by zero-based option index (options lack `data-test`; wording is copy, so position is the only stable handle).
- **`settled()`** — waits for the `@catalogue` intercept and the `aria-busy` flag to clear before the next assertion.
- **`describe('VI1 · Browse the catalogue like a person')`** — single `it` block that walks the entire journey step-by-step using `cy.step()` narrative markers.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports `cents`, a utility that parses a price string into integer cents, used by `shownPrices()` to read card prices off the DOM.
- **`scripts/e2e/cents.ts`** — the `cents` utility originates here and is re-exported through `steps.ts` into this test.

## Notes

- The file header declares `requires-module: products`; the test assumes that module's data is seeded before it runs.
- `pickTag` and the price-band calculation both include `expect` guards that fail the test if the seed data is too small or too uniform—these are data-adequacy assertions, not product assertions.
- The price band is computed as `prices[1]` to `prices.at(-2)` of the tag-filtered set, guaranteeing at least one product is excluded at each edge.
- `chooseOption` targets `.v-overlay-container .v-list-item` because Vuetify renders dropdown options in a teleport container outside the select element.
- The "shared URL" sub-step re-navigates to `/en` first, then `cy.visit(shared)`, simulating a cold open of the copied address.
