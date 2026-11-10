---
source: tests/e2e/specs/journeys/at5-lists-keep-their-view.cy.ts
sha256: 785b3079d0dd3f72ca36a8add8ba3eadf2b68415d6bd0bc88355cf66e4abd219
signature: b236e457b3f0be2b9e308ab231031bdd345d6c84fb4df371cd8398d9b9a75741
generated_at: 2026-11-10T06:51:06.519473+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/at5-lists-keep-their-view.cy.ts

## Purpose

E2E journey test (AT5) verifying that staff-facing lists encode their active filter in the URL address, so a page reload or a freshly opened copied link restores the same filtered rows. Also asserts that requesting a page beyond the last one renders no rows (and a way back to page 1) without crashing. A second block covers the inventory board and ledger, which live-filter with prefixed query keys and have no explicit search button.

## Key elements

- **`ListCase`** – interface describing one staff-list test: display `name`, route `path`, a `narrow()` closure that applies the list's own filter control, and `pagerPastEnd` (whether a pager is rendered when past the end; `false` for webhook subscriptions, which are single-page).
- **`rowsSettleOn(expected: string[])`** – retries `cy.get('[data-test=row-view]')` until the row hrefs match `expected`, guarding against a mid-refetch read.
- **`onlyAdjusted()`** – retries until the ledger shows ≥ 1 movement and every chip contains "Adjusted".
- **`CASES`** – four `ListCase` entries (orders, users, products, webhook subscriptions) with their respective filter selectors.
- **`describe('AT5 · Staff lists keep their view')`** – for each case: applies a filter, asserts the URL query is non-empty, confirms narrowed ≠ unfiltered, then verifies a reload and a fresh `cy.visit(href)` both restore the narrowed rows; finally `resetSearch()` restores the full list. Also visits `?page=999` and asserts no rows + pagination (or search-reset) is present.
- **`describe('AT5 · The stock board and ledger keep their view')`** – board "low stock only" toggle and ledger "Adjusted" reason filter: each survives reload and copied link. Paged-end checks use `levels-page=999` / `movements-page=999`.

## Relationships

- **`tests/support/e2e/steps.ts`** – provides `listedIds()` (returns the current row id list), `resetSearch()` (clears the active filter), and `submitSearch()` (triggers the list's filter application). All three are imported at the top and used throughout both `describe` blocks.

## Notes

- `beforeEach` calls `cy.restore()` then `cy.loginAs('admin')`; the module header comment lists required seeded modules (`account, inventory, orders, products, users, webhooks`).
- Webhook subscriptions have `pagerPastEnd: false` because they render a single page; the past-end check falls back to `resetSearch()` instead of asserting a `.v-pagination` button.
- The inventory board/ledger queries use prefixes (`levels-`, `movements-`) in the search string, distinguishing them from the generic `page` param used by the other lists.
- The test intentionally does **not** assert on browser history: the filter is designed to replace (not push) the history entry, so Back leaves the list rather than undoing a search.
- `rowsSettleOn` and `onlyAdjusted` both exist to handle the race where a list re-fetches after the address changes; a single synchronous read can catch stale rows.
