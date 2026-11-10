---
source: src/modules/orders/tests/routes.spec.ts
sha256: 2890bdcfce4cd2cb39b12bb73149e6150629a635f8772ec1ccd2578d8ea3e6db
signature: 80ba74e07580eb1dd5344a530f266c81581b1ea72219e98615c81971bac7651d
generated_at: 2026-11-10T05:04:31.028905+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/routes.spec.ts

## Purpose

Vitest spec that asserts every orders route record's `meta.access` and `meta.can` permission against a hard-coded table, keyed by route name. It guards against a route silently losing its access declaration (which would make it indistinguishable from a public route) and against new routes being added without an explicit access decision.

## Key elements

- **`byName(name)`** — local helper that finds a `RouteRecordRaw` in the imported `routes` array by its `name` property.
- **`it.each` table** — four-tuple `(name, access, action, subject)` driving per-route assertions on `meta.access` and `meta.can`.
- **Staff-permission guard** — asserts `SalesOrders` uses `['display', 'Order']` (not `read:Order`, which a customer also holds) and that `OrdersList` has no `can` at all.
- **Scope props** — asserts `OrdersList` carries `props: { scope: 'mine' }` and `SalesOrders` carries `props: { scope: 'all' }`.
- **Completeness check** — verifies the set of route names in the module exactly matches the four known names, so a new route added without an entry in the table fails the suite.

## Relationships

- **`src/modules/orders/routes.ts`** — imported as default; the spec reads its exported `RouteRecordRaw[]` directly. No router instance, locale prefix, or app context is required.

## Notes

- Tests against the raw route array, not a resolved `createRouter` instance, so it runs without mounting the app or configuring a locale prefix.
- The completeness test (`declares no route this file does not know about`) is the mechanism that forces a new route to carry an explicit access decision; without it, a missing entry would simply be untested.
- Lives inside the orders module (not a cross-cutting/platform spec) so that deleting the module doesn't break an unrelated spec, per the module-ownership principle in `docs/theory/modules.md`.
