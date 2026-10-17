---
source: tests/e2e/specs/journeys/at5-orders-filters.cy.ts
sha256: af4ef0560c3944cb120bb65c800fd2e3d4e6740e8ab55776ae19353824bb0ca8
generated_at: 2026-10-17T02:07:53.364867+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/at5-orders-filters.cy.ts

## Purpose

End-to-end Cypress spec verifying that every staff-level filter on the Orders list (status, id, email, awaiting-transfer, deleted) narrows the visible rows to exactly the matching set, that **Reset** restores the full list, and that the pager advances without duplicating rows or losing items when the page size grows.

## Key elements

- **`describe('AT5 · Orders list filters')`** — top-level suite; `beforeEach` restores fixtures, logs in as `admin`, and navigates to `/en/sales/orders` with network tracking.
- **`it('status, id, email, awaiting transfer and deleted each narrow the list…')`** — the primary test. Fetches seeded subject IDs (`order.paid`, `order.awaitingTransfer`, `order.softDeleted`), captures the baseline `listedIds()`, then exercises each filter in turn:
  - *status*: every row must contain "Paid"; reset restores baseline.
  - *id*: result is exactly `[paidId]`.
  - *email*: seeded `order.otherPending` is included; `paidId` is excluded.
  - *awaiting transfer*: `transferId` included, `paidId` excluded; checkbox is unchecked before reset.
  - *deleted*: "Deleted only" → exactly `[deletedId]` with one `[data-test=row-deleted]` row; "Not deleted" → `deletedId` absent, no `row-deleted` row; reset restores baseline.
- **`it('the pager moves through the list…')`** — asserts the first page holds exactly 10 rows (seed assumption), clicks page 2, verifies no overlap with page 1, then switches page-size to 50 and confirms the list grows.
- **Imports from `steps.ts`**: `listedIds` (collects order IDs from visible rows), `submitSearch` (triggers the filter form), `resetSearch` (clears all filters).

## Relationships

- **`tests/support/e2e/steps.ts`** — source of `listedIds`, `resetSearch`, and `submitSearch`. The spec relies on these helpers for every filter assertion and reset cycle; no filter logic is duplicated locally.

## Notes

- The header comment `requires-module: account, orders` indicates the test depends on both modules being installed/available in the test environment.
- The filter test is one long `it` with deeply nested `.then()` chains (four levels) to capture multiple subject IDs before asserting. A failure mid-chain leaves earlier filters un-reset, but `resetSearch` is called after each sub-step to isolate state.
- The pagination test hard-codes an expectation of exactly **10** rows on the default first page — this is a seed-data contract, not a UI constant. Changing the seed or default page size will break it.
- `cy.settleNetwork()` / `cy.trackNetwork()` pair is used instead of a fixed `cy.wait`; mutations must finish before assertions run.
- The email filter intentionally uses a *different* subject (`order.otherPending`) than the paid subject to prove exclusion, not just inclusion.
