---
source: src/modules/products/tests/e2e/resilience.cy.ts
sha256: cc67bc81c8da6b6bc7cb54e3cb83d6c640ca89fe55bed2f9955f980a52ed9312
generated_at: 2026-10-02T15:34:02.757459+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/e2e/resilience.cy.ts

## Purpose

Product-catalogue share of the application's resilience e2e sweep. Validates that the list, detail, empty-state, and pagination UIs degrade gracefully (no overflow, no blank renders) regardless of what the dataset actually contains, including the intentionally sparse `barebones` record. Extracted from the central `tests/e2e/specs/resilience.cy.ts` under ticket FA122.

## Key elements

- **`DEFAULT_PAGE_SIZE`** (const, 10) – mirrors `ProductsList.vue`'s first entry in `pageSizeOptions`; used as the threshold for the pagination-visibility check.
- **`describe('the catalogue renders whatever the dataset holds')`** – two specs: (1) public list route is healthy and at least one card renders; (2) as admin, every row's detail page opens, the `#product-target` element exists, and no horizontal overflow occurs. Hrefs are collected upfront to avoid N→2N round-trips.
- **`describe('lists tolerate being empty')`** – types a non-matching query into the filter, submits, and asserts `[data-test=products-empty]` appears while no `product-card` remains; also checks no overflow.
- **`describe('pagination agrees with the rows actually rendered')`** – as admin, reads the rendered row count and asserts `.v-pagination` exists *iff* rows ≥ `DEFAULT_PAGE_SIZE`. Written as a screen-agreement rather than a fixed expectation so it tracks dataset growth.
- **`beforeEach` (all blocks)** – `cy.visit('/en')` then `cy.restore()` to reset seeded state.

## Relationships

- **`tests/support/e2e/resilience.ts`** – provides the two shared helpers this file calls: `assertRouteIsHealthy(route, selector)` (verifies a route responds with the expected root element) and `assertNoHorizontalOverflow()` (checks `document.documentElement.scrollWidth ≤ clientWidth`). This file contains no test-specific setup beyond those two imports.

## Notes

- Assertions deliberately avoid pinning exact titles, counts, or field values; the goal is "doesn't crash / doesn't overflow," not "shows the right data." A broken image or a `TypeError` in a console would still let value-based specs pass.
- The pagination spec relies on the server-reported `totalItems` (stored by vue-toolkit's `useStructureCrudApi`) rather than a local row count; a local-only count would make the "pagination must exist" branch unreachable. The comment references a bug this test caught before that fix landed.
- The `barebones` product (no description, categories, or tags) is only visible in the **admin** list (it carries inactive/soft-deleted rows), which is why spec 2 logs in as admin rather than using the guest grid.
- Timeout of `10_000` ms is applied to the initial `[data-test=list-row]` query to absorb slow admin-table hydration; other queries use the default.
