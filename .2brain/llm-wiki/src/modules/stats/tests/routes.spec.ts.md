---
source: src/modules/stats/tests/routes.spec.ts
sha256: fe3a36895c9fd244c81bd96a0890cb7f9a11675c681e8326b510c423876aa882
generated_at: 2026-10-17T01:43:57.162581+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/tests/routes.spec.ts

## Purpose

Guards the `meta.access` and `meta.can` declarations on every stats route by asserting their exact values against hardcoded expectations. Because a route that silently loses its permission is indistinguishable from a public one, the test spells out each expected value rather than deriving it, and also enforces that no undeclared route has been added.

## Key elements

- **`byName(name)`** — helper that looks up a `RouteRecordRaw` in the imported `routes` array by its `name` field; returns `undefined` if not found.
- **`it.each` (access / permission)** — iterates over a table of `[name, access, action, subject]` tuples and asserts each route's `meta.access` and `meta.can` match exactly. Currently covers `StatsDashboard` and `StatsProductSales` (both `auth` / `['read', 'Stats']`).
- **`'declares no route this file does not know about'`** — completeness guard: asserts the sorted list of all route names equals the sorted list of names this file enumerates, so a new route added in `routes.ts` breaks the test until it's listed here.
- **`'hands the product id to the view as a prop'`** — asserts `StatsProductSales` has `props: true` so the route parameter is forwarded to the component.

## Relationships

- **`src/modules/stats/routes.ts`** — the sole SUT. The test imports its default export (`routes`) and reads `name`, `meta.access`, `meta.can`, and `props` off each record. No other file is imported or referenced.

## Notes

- The module-level doc comment makes the intent explicit: values are *written out*, not computed, precisely so a missing permission reads as a test failure rather than a no-op.
- Adding a new route to `routes.ts` without updating this spec will fail the "no unknown route" test, forcing the developer to consciously declare the new route's access level.
- Uses `toSorted()` (non-mutating) rather than `sort()`; if the Node/Vitest target doesn't support it, swap for `[...arr].sort()`.
