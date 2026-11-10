---
source: src/modules/stats/tests/e2e/roles.cy.ts
sha256: 90d9b0066c0738cab33f9c9fc94b68bfdbf9101ad32e5242aeb2b4138ab1e243
signature: 90d9b0066c0738cab33f9c9fc94b68bfdbf9101ad32e5242aeb2b4138ab1e243
generated_at: 2026-11-10T05:51:10.365535+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/tests/e2e/roles.cy.ts

## Purpose

End-to-end permission sweep for the stats module. It registers a list of stats pages and asserts that, for every known persona, the browser's access decisions (redirect, 403, or allow) agree with that persona's own `can` rules. It lives alongside the module it tests so that deleting the module also removes its sweep.

## Key elements

- **`sweepRoles('stats', …)` call** — The single top-level invocation. Passes the module name `'stats'` and an array of page descriptors to the shared helper; the helper iterates personas and drives the Cypress session for each entry.
- **`sales dashboard` descriptor** — Route `/en/sales/stats`; requires `['read', 'Stats']`; declares `menuHref` (for verifying nav visibility) and `pageRoot` (`#stats-dashboard-page`) used by the helper to confirm the page rendered.
- **`one product sales` descriptor** — Dynamic route built from `cy.subjectId('product.rich')` → `/en/sales/stats/products/:id`; same permission pair; `pageRoot` is `#stats-product-sales-page`. No `menuHref`, so menu-visibility checks are skipped for this entry.

## Relationships

- **`tests/support/e2e/role-sweep.ts`** (imported) — Provides the `sweepRoles` function that orchestrates the actual persona iteration, login, navigation, and assertion logic. This file supplies only the case data; all browser interaction lives in the helper.

## Notes

- The `route` field can be either a static string or a function returning a Promise (as in the product-sales entry, which resolves a fixture ID). The helper handles both shapes.
- `can` arrays are the single source of truth for what permission a persona needs; the helper does not re-derive them.
- Because this file is a pure data declaration with no `describe`/`it` blocks of its own, test reporters will show the suite names coming from `role-sweep.ts` rather than from here.
- The file is `@module`-annotated with no named exports; it is a side-effect test file that runs on import.
