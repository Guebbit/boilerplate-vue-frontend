---
source: src/modules/stats/tests/e2e/stats.cy.ts
sha256: 2b1f94414ccecaaa9b1a4e493d6b371d1fda8d0ff8a36fb86245ca4514e055b2
generated_at: 2026-10-17T01:43:36.976097+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/tests/e2e/stats.cy.ts

## Purpose

Cypress end-to-end spec for the **Sales dashboard** (`/en/sales/stats`). It drives the real backend to verify that the dashboard renders its stat blocks, the chart can toggle to a table, an impossible date range is rejected client-side, a preset triggers the expected API call, and a non-admin user is redirected away.

## Key elements

- **`describe('Sales dashboard')`** — top-level suite; its `beforeEach` visits `/en` and calls `cy.restore()` (custom command, likely resets network stubs or app state).
- **`describe('as an administrator')`** — logs in as `admin` via `cy.loginAs`, visits `/en/sales/stats`, and asserts `#stats-dashboard-page` is present.
  - *Shows all stat blocks* — asserts existence of `[data-test=stats-sales]`, `stats-products`, `stats-operations`, and `stats-time-zone`.
  - *Chart ↔ table toggle* — clicks `[data-test=chart-toggle]` on the first `[data-test=chart-block]` and verifies `[data-test=chart-table]` appears then disappears.
  - *Invalid period guard* — types `2020-01-01` into `[data-test=stats-from] input`, expects `[data-test=stats-period-problem]` to contain "two years" and `[data-test=stats-apply]` to be disabled.
  - *Preset re-reads* — intercepts `GET **/stats/sales*`, clicks `[data-test=stats-preset-last-7]`, asserts the request URL includes `from=`.
- **`describe('as a customer')`** — logs in as `user`, visits `/en/sales/stats`, and asserts the app redirects to `/en` (home page).

## Relationships

No graph neighbors are recorded for this file.

## Notes

- Selectors are all **`data-test` attributes** — the project convention for e2e hooks; do not rely on class names or structure.
- `cy.loginAs` and `cy.restore` are **custom Cypress commands** (not standard API); see the Cypress support file for their definitions.
- The "impossible period" test is **purely client-side validation** — no network call is intercepted, confirming the guard fires before any request is sent.
- The preset test uses `cy.intercept` only to **assert the outgoing request shape** (that `from=` is present), not to stub a response.
- Happy-path tests hit the **real backend**; there are no stubs in this file.
