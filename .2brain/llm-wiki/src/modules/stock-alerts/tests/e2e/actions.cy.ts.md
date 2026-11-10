---
source: src/modules/stock-alerts/tests/e2e/actions.cy.ts
sha256: 4613852ff66052758b05976fd971a4d0c912594fb895cc91cc9310190683617b
signature: 4273157cce130f011f7f946b9890ec504ada8d17fb3a4a2ca057419c9f827d30
generated_at: 2026-11-10T05:55:22.073952+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stock-alerts/tests/e2e/actions.cy.ts

## Purpose

E2E tests for the stock-alerts module's failure and empty-state behaviors. Drives three scenarios through the shared `actionTable` runner: a failed "notify me" request, a failed request withdrawal, and an empty alerts list, verifying that UI controls persist, alerts display, and empty copy renders correctly.

## Key elements

- **`soldOutProduct()`** — Helper that creates a new product via the editor API (`POST /products`) with a timestamped title to guarantee uniqueness, then returns the product ID. Used to set up a product with no stock so the "notify me" flow is eligible.
- **`actionTable('stock-alerts', …)`** — The test table with three rows:
  - *Failed "notify me" (row)*: Intercepts `POST **/stock-alerts` to return a server fault; asserts the `notify-me` button persists, the `notify-me-error` alert is visible, and a retry succeeds.
  - *Failed withdrawal (row)*: Creates an alert first, then intercepts `DELETE **/stock-alerts/*` with a fault; asserts the `stock-alert-row` persists, the `stock-alerts-error` alert is visible, and retry succeeds.
  - *Empty list (empty)*: Intercepts `GET **/stock-alerts` to return `{ items: [] }` validated against `ListStockAlertsResponse`; asserts the `stock-alerts-empty` copy is shown and no `stock-alert-row` elements exist.

## Relationships

- **`tests/support/e2e/action-table.ts`** — Provides the `actionTable` runner. This file delegates all execution logic (intercept setup, trigger, assertions, retry) to it; each row in the table is one scenario.
- **`contracts/rest/schemas.zod.ts`** — Supplies `ListStockAlertsResponse`, used as the `emptySchema` in the empty-state row so the mocked response is validated against the canonical contract before assertion.

## Notes

- `soldOutProduct` is intentionally not exported; it exists only for in-file setup and uses `Date.now()` in the title to avoid collisions across runs.
- The "row" rows rely on the `actionTable` runner's built-in retry-and-assert cycle (trigger → intercept fault → verify control + alert → retry succeeds). The file itself only declares *what* to intercept and *which* selectors to check.
- Selectors are `data-test` attributes (`notify-me`, `stock-alert-cancel`, `stock-alert-row`, `stock-alerts-empty`), not text-based, so copy changes won't break the tests as long as the attributes remain.
