---
source: tests/e2e/specs/journeys/op27-the-shop-in-numbers.cy.ts
sha256: 1f400635b56042e34300cf969a057bb52dd8361155e81a22b2f5d4793f34b67c
signature: 7834a80258e2436d7d3e6841b089238cf51b6c80b9634616396a71eb15c0ead6
generated_at: 2026-11-10T07:15:23.030770+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op27-the-shop-in-numbers.cy.ts

## Purpose

End-to-end journey spec covering the manager's stats dashboard ("The shop in numbers"). It verifies that a product's sold-count transitions from zero to two after a purchase, that the product row links through to the correct order, that refunds reflect in the totals card, that the revenue table exports a matching CSV, and that week/month regrouping produces the exact bucket count the date range touches. It exists to lock down the stats module's display logic and cross-page navigation in one coherent story.

## Key elements

- **`moneyOf(text)`** — Extracts the first cent-precision amount from a stats card's text and returns it as a `number` (commas stripped). Throws if no amount is found.
- **`applyPeriod(from, to)`** — Types a date range into the `[data-test=stats-from]`/`stats-to` inputs and clicks Apply.
- **`rowsSettleAt(interval, expected)`** — Picks a Week or Month grouping, clicks Apply, and asserts the revenue table's `<tbody>` settles on exactly `expected` rows (guards against reading a stale pre-refetch row count).
- **`bucketsTouched(from, to, interval)`** — Pure helper that iterates day-by-day over an inclusive range and counts distinct bucket-start dates (Monday for weeks, 1st for months). Mirrors backend logic in `src/modules/stats/domain/calendar.ts`.
- **`describe('OP27 · The shop in numbers')`** — Two test cases:
  - *"moves the product's row with a sale and leads from it to the order"* — full buy → pay → dashboard → product page → "View orders" → single filtered order → empty-period check.
  - *"shows a refund in the numbers, saves the revenue as a CSV and regroups by week and month"* — refund flow (record → mark returned), refunds-card delta, CSV column/row parity with the table, Week/Month bucket-count assertions, and a zero-sales empty-state check.

## Relationships

- **`tests/support/e2e/steps.ts`** — Provides `checkoutAs` (drives the multi-step checkout API sequence as a given user) and `downloadedText` (waits for and reads a browser download). Both are the only cross-file imports; all other interactions use `cy` commands directly against the running app or its REST API.

## Notes

- Products are priced at **50 000.00** so they land in the dashboard's top-ten regardless of seed data; shop-wide totals use `at.least` assertions because other live specs sell concurrently. Only the spec's own product row is compared exactly.
- `beforeEach` calls `cy.restore()` to reset to a known seed state, then revisits `/en`.
- The `bucketsTouched` helper duplicates the backend `bucketStart` rule (week starts Monday, month on the 1st); if backend calendar logic changes, this helper must be updated in lockstep.
- Cash refunds open in a **pending** state; the test must call "Mark returned" before the refunds card updates. The UI copy explicitly instructs the admin to hand cash back outside the app.
- The `requires-module` comment at the top (`account, cart, orders, payments, products, stats`) documents which server-side modules this spec depends on for seeding/setup.
