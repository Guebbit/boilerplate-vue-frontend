---
source: src/modules/products/tests/e2e/resilience.cy.ts
sha256: fc05ca175910dfdf7cdc4ff84f5fa21be612986e596a1e7be482d8492b4d7618
signature: fc05ca175910dfdf7cdc4ff84f5fa21be612986e596a1e7be482d8492b4d7618
generated_at: 2026-11-10T05:24:00.720961+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/e2e/resilience.cy.ts

## Purpose

The catalogue's slice of the app-wide resilience sweep, split out of the central `tests/e2e/specs/resilience.cy.ts` because its assertions only make sense with a products dataset behind them: route health on a shop-only page, an empty-search state, pagination/row-count agreement, and rendering of the deliberately sparse `barebones` record. Like the central file, it asserts no exact titles or counts on purpose, so that rendering breakage (broken images, TypeErrors, overflow) is caught even when value-asserting specs stay green.

## Key elements

- **`DEFAULT_PAGE_SIZE`** (`const`, = 10) — mirrors the default in `ProductsList.vue`'s `pageSizeOptions`; used as the threshold in the pagination test.
- **`describe('the catalogue renders whatever the dataset holds')`**
  - *serves the public list quietly and inside the viewport* — asserts route health on `/en/products` and that at least one product card exists.
  - *opens a detail page for every product an admin can see, including the sparse one* — logs in as admin, collects every row's `href` in one pass, then visits each directly (N loads, not 2N), asserting the `#product-target` exists and the layout passes `checkLayout` at `phone-small` width.
- **`describe('lists tolerate being empty')`**
  - *renders an empty catalogue rather than breaking when a search matches nothing* — types a nonsense query, submits, and asserts the `#products-empty` sentinel appears while product cards do not.
- **`describe('pagination agrees with the rows actually rendered')`**
  - *shows the pagination control only when the catalogue does not fit on one page* — as admin, checks the row count against `DEFAULT_PAGE_SIZE` and conditionally asserts `.v-pagination` exists or does not.

## Relationships

- **`tests/support/e2e/apply-viewport.ts`** — imports `applyViewport`, used inside the detail-page loop to toggle between `phone-small` and `desktop` widths before each `checkLayout` call.
- **`tests/support/e2e/resilience.ts`** — imports `assertRouteIsHealthy` (verifies a route returns a healthy status and its target element) and `assertFitsTheScreen` (asserts no horizontal overflow at the current viewport); both are called across the three describe blocks.

## Notes

- Every `beforeEach` does `cy.visit('/en'); cy.restore();` — the restore is essential because prior tests (especially the admin-login tests) leave auth state behind.
- The empty-state test reaches the condition via a user-facing search rather than by deleting seed data; the seeded collections are intentionally always populated.
- The pagination test is deliberately a *conditional* assertion (if/else on row count) rather than a fixed "must exist / must not exist" check, so it remains meaningful as the demo catalogue grows or shrinks. It was written after catching a real bug where `pageTotal` was computed locally instead of from the server's `totalItems`.
- The detail-page loop collects all `href`s before visiting to halve page-load count; this is the only place that walks both sparse and rich records in a single pass.
