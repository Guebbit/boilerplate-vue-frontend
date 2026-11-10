---
source: src/modules/orders/tests/e2e/actions.cy.ts
sha256: 539dba7b76b81b4636247fccf97ad52f14f233714797c5a3ad62a37cabe04b3d
signature: 32de0745747a225e9c68f96d787964d555a5158b15d57515c1ee786bc9bd5f21
generated_at: 2026-11-10T05:01:25.686945+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/e2e/actions.cy.ts

## Purpose

Registers the orders module's failure, empty-state, and slow-load e2e scenarios with the shared `actionTable` runner. Each scenario specifies a persona, route, network intercept, and UI assertions so the runner can drive a consistent "trigger → error → verify → retry succeeds" cycle without per-test boilerplate.

## Key elements

- **`emptyPage`** — Minimal `SearchOrdersResponse` literal (zero items) used as the stubbed body for the two empty-state rows.
- **`actionTable('orders', [...])`** — The single call that registers nine scenarios:
  - *form* (edit): failed PATCH keeps typed values, retry succeeds.
  - *empty* (user): `/en/orders` shows empty state with a cart CTA.
  - *empty* (staff): `/en/sales/orders` shows empty state **without** a cart CTA.
  - *slow* (edit): slow GET leaves form closed until data lands; refetch preserves typed text.
  - *dialog* (hold): failed POST keeps dialog open with reason/note; retry succeeds.
  - *dialog* (ship): failed POST keeps tracking code; retry succeeds.
  - *row* (cancel): failed POST keeps the cancel button; retry succeeds.
  - *row* (export): failed GET shows generic 500 message; list rows persist.
  - *row* (reorder): failed POST keeps the buy-again button; retry succeeds.

## Relationships

- **`tests/support/e2e/action-table.ts`** — Provides the `actionTable` runner. This file is purely declarative input to it; all driving logic (intercept setup, alert assertions, retry flow) lives in the runner.
- **`contracts/rest/schemas.zod.ts`** — Exports `SearchOrdersResponse`, imported here to type-validate the `emptyPage` stub body against the real API contract.

## Notes

- The **export** scenario intentionally asserts the generic "Something went wrong on our side" message rather than an envelope message, because a CSV response body is parsed as text and the app falls back to its catch-all 500 string.
- `kind` values (`form`, `empty`, `slow`, `dialog`, `row`) select the assertion strategy inside `actionTable`; the file itself contains no test-runner imports beyond that one helper.
- Dynamic routes use `cy.subjectId(...)` (e.g. `order.otherPending`, `order.paidExpress`) to resolve concrete order IDs at runtime rather than hard-coding them.
