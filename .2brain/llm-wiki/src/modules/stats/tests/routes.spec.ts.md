---
source: src/modules/stats/tests/routes.spec.ts
sha256: fe3a36895c9fd244c81bd96a0890cb7f9a11675c681e8326b510c423876aa882
signature: 80ba74e07580eb1dd5344a530f266c81581b1ea72219e98615c81971bac7651d
generated_at: 2026-11-10T05:51:57.474463+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/tests/routes.spec.ts

## Purpose

Pins the `meta.access` and `meta.can` values declared on every stats route so that a silently dropped or changed permission is caught immediately. Each expected value is written out explicitly (rather than derived from a helper) to make regressions obvious in diffs.

## Key elements

- **`byName(name: string): RouteRecordRaw | undefined`** — Small lookup helper that finds a route record by its `name` in the imported `routes` array.
- **`describe('stats route access')`** — Top-level suite containing three tests:
  - **`it.each([...])`** — Table-driven assertion that `StatsDashboard` declares `access: 'auth'` / `can: ['read', 'Stats']` and `StatsProductSales` declares the same pair.
  - **`'declares no route this file does not know about'`** — Completeness guard: asserts the sorted list of all route names equals exactly `['StatsDashboard', 'StatsProductSales']`, forcing this spec to be updated whenever a new route is added.
  - **`'hands the product id to the view as a prop'`** — Verifies `StatsProductSales` has `props: true` so Vue Router forwards the `:productId` param to the component.

## Relationships

- **`src/modules/stats/routes.ts`** — The sole subject under test. This spec imports its default export (`routes`) and reads `name`, `meta`, and `props` off each record.

## Notes

- Permission values are **hard-coded literals** in the test table, not computed from a shared constant. This is deliberate: the doc comment explains that a route losing its permission is indistinguishable from a public one, so the expected string must appear in the diff when it changes.
- The completeness test means **adding a new route without updating this file will fail CI**—a useful tripwire but one to remember when scaffolding a new stats view.
- Uses `Array.prototype.toSorted()` (ES2023) rather than `.sort()`, indicating the project targets a modern runtime.
