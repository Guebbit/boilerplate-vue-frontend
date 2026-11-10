---
source: src/modules/stats/tests/e2e/stats.cy.ts
sha256: fec8620513eb14a2b182b8707dcad04f81c6d6ed78befd4de0bf854a535f4d28
signature: fec8620513eb14a2b182b8707dcad04f81c6d6ed78befd4de0bf854a535f4d28
generated_at: 2026-11-10T05:51:27.092672+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/tests/e2e/stats.cy.ts

## Purpose

Cypress end-to-end spec for the Sales Dashboard (`/en/sales/stats`). It verifies the page renders its stat blocks, that a chart can be toggled to a table and back, that an out-of-range period is rejected client-side using the server-supplied limit, and that non-admin users are redirected away. The file explicitly states that figure *correctness* is proven elsewhere (backend tests); here it only checks the page puts values on screen.

## Key elements

- **`describe('Sales dashboard')`** — top-level suite; `beforeEach` visits `/en` and calls `cy.restore()` (a custom command that resets app state).
- **`describe('as an administrator')`** — logs in as `admin`, visits the stats page, and asserts the `#stats-dashboard-page` root exists before each case.
  - *shows the sales block, the products block and how the shop is running* — asserts four `[data-test]` blocks (sales, products, operations, time-zone) are present.
  - *reads a chart as a table and back* — toggles the first `[data-test=chart-block]` between chart and table views via `[data-test=chart-toggle]`.
  - *refuses an impossible period before asking the server* — intercepts `GET **/stats/sales*`, reads `limits.maxRangeDays` from the response, types a date that exceeds the limit, and asserts the `[data-test=stats-period-problem]` message and a disabled Apply button. No second network call is made.
  - *re-reads for a preset* — clicks `[data-test=stats-preset-last-7]` and asserts the intercepted request URL includes `from=`.
- **`describe('as a customer')`** — logs in as `user`, visits the stats page, and asserts redirect to `/en` (home page).

## Relationships

No graph neighbors are recorded for this file. It runs against the full application under test (the stats dashboard route) and relies on custom Cypress commands (`cy.loginAs`, `cy.restore`) that are defined in the shared test-setup layer.

## Notes

- The spec deliberately does **not** assert specific numbers; the module docblock states figures are proven in backend tests. This file only checks that the UI surfaces them.
- The "impossible period" test reads `maxRangeDays` dynamically from an intercepted response so the spec stays correct if the server's ceiling changes.
- `{ timeout: 10_000 }` is used on `stats-time-zone` and `chart-block` selectors, implying those elements load asynchronously (likely after an API call resolves).
- The file lives under `tests/e2e/`, confirming it is a browser-level integration test, not a unit or component test.
