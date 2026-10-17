---
source: src/modules/products/tests/e2e/resilience.cy.ts
sha256: cd11dc1f41d2a720c6ba885cc7e9e9c81dc77e136a756f8c8567cbd5feab56e2
generated_at: 2026-10-17T01:29:38.616783+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/e2e/resilience.cy.ts

## Purpose

Catalogue-specific slice of the site-wide resilience sweep (extracted from the central `tests/e2e/specs/resilience.cy.ts`). It verifies that the products list and detail pages render gracefully under edge conditions — a sparse record, an empty search result, and pagination state — without asserting on exact titles or counts, so the specs stay green while still catching layout breaks, uncaught exceptions, or viewport overflow.

## Key elements

- **`DEFAULT_PAGE_SIZE`** (const, `10`) — mirrors the default in `ProductsList.vue`'s `pageSizeOptions`; used to decide whether pagination should be visible.
- **`describe('the catalogue renders whatever the dataset holds')`**
  - *serves the public list quietly and inside the viewport* — hits `/en/products` as a guest, expects at least one `product-card`.
  - *opens a detail page for every product an admin can see, including the sparse one* — logs in as admin, collects all `row-view` hrefs upfront, then visits each one asserting `#product-target` exists and no horizontal overflow. Covers the `barebones` product (all optional fields at schema defaults).
- **`describe('lists tolerate being empty')`**
  - *renders an empty catalogue rather than breaking when a search matches nothing* — types a non-existent string into the filter, submits, expects `[data-test=products-empty]` present and no `product-card`.
- **`describe('pagination agrees with the rows actually rendered')`**
  - *shows the pagination control only when the catalogue does not fit on one page* — as admin, reads rendered row count; if ≥ `DEFAULT_PAGE_SIZE` expects `.v-pagination` to exist, otherwise to be absent. Uses server-reported `pageTotal` (via vue-toolkit's `useStructureCrudApi`) rather than a local count.

## Relationships

- **`tests/support/e2e/resilience.ts`** — imports `assertRouteIsHealthy` (verifies a route returns 200 and a target selector is present) and `assertNoHorizontalOverflow` (checks no element exceeds the viewport width). Both helpers are called throughout the three `describe` blocks.

## Notes

- Every `beforeEach` calls `cy.restore()` after visiting `/en`, resetting the seed dataset so tests are deterministic regardless of execution order.
- The admin detail-loop test deliberately collects all hrefs first, then visits each in sequence (N page loads instead of 2N), because the admin list is the only view containing inactive, soft-deleted, and the `barebones` rows.
- The pagination assertion is written as a conditional agreement between two on-screen elements rather than a fixed expectation, so it remains meaningful as the demo catalogue grows. The comment notes this test caught a real bug where a local-only row count always took the "not exist" branch.
- The empty-search test notes the demo dataset intentionally always has rows, so the empty state is only reachable through a user action (a non-matching search).
