---
source: tests/e2e/specs/journeys/at5-payments-filters.cy.ts
sha256: 4647f5116a310af371407835ef7c28b9854d4da93c012916368104a8f689b8b7
signature: d77e3f8254cafb3ef4e57bb7de4d002f3f13d2f67709c3a657096759776b0d41
generated_at: 2026-11-10T06:51:26.704139+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/at5-payments-filters.cy.ts

## Purpose

E2E spec that verifies every filter on the Sales → Payments page (payments tab and refunds tab) actually narrows the row list to matching entries and empties it when the filter window contains no data. It relies on seeded subjects to supply known payment attributes, then asserts inclusion and exclusion by order id.

## Key elements

- **`PaymentLike`** – interface describing the subset of a payment object the tests read (provider, method, reference, amount, createdAt, receivedAt).
- **`listedOrders(link)`** – helper that queries all rows' order-link elements (`data-test`) and returns the array of order ids parsed from each `href`.
- **`narrowedTo(apply, included, excluded)`** – helper that runs a filter function, clicks the payments search submit, asserts the listed orders include the expected ids and exclude the others, then clicks reset.
- **`describe` block / `beforeEach`** – restores fixtures, logs in as admin, navigates to `/en/sales/payments`, and waits for the "all payments" panel.
- **First `it` (payments filters)** – exercises method, provider, order-id, reference, amount (min = max), created window, and received window filters; uses `narrowedTo` and inline assertions.
- **Second `it` (refunds filters)** – switches to the refunds tab and exercises status, reason, order-id, and created-window filters with the same include/exclude pattern.

## Relationships

- **`tests/support/e2e/steps.ts`** – imports `dayShifted` (shifts a date string by ±N days for window filters) and `paymentOfOrder` (fetches the seeded payment record for a given order id and admin role).

## Notes

- Header comment declares `requires-module: account, orders, payments`; the test will fail if those modules are absent from the seed.
- `beforeEach` calls `cy.restore()` before logging in, so every test starts from a clean fixture state.
- Order ids are extracted from the anchor `href` by splitting on the literal string `/orders/`; this couples the test to the URL shape of the order detail route.
- The provider-filter assertion is written inline (not via `narrowedTo`) because it checks that every row's text contains the provider name, then verifies an unknown provider yields zero rows.
- The received-window step falls back to `cash.createdAt` when `receivedAt` is undefined, which can silently widen the window if the seed omits the field.
- All selectors use `data-test` attributes; there are no CSS-class or text-based selectors.
