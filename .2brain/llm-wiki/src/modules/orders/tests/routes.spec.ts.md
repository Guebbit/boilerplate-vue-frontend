---
source: src/modules/orders/tests/routes.spec.ts
sha256: 2890bdcfce4cd2cb39b12bb73149e6150629a635f8772ec1ccd2578d8ea3e6db
generated_at: 2026-10-17T01:19:06.688878+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/routes.spec.ts

## Purpose

Vitest spec that verifies every orders route record carries the expected `meta.access` and `meta.can` declarations. It guards against a route silently losing its access metadata (which would make it indistinguishable from a public route) and ensures no new route is added without an explicit access decision.

## Key elements

- **`byName(name)`** — local helper that looks up a route record in the imported `routes` array by its `name` property.
- **`it.each` access/permission table** — drives assertions over four routes (`OrdersList`, `SalesOrders`, `OrderTarget`, `OrderEdit`), checking `meta.access` and `meta.can` (a `[action, subject]` tuple or `undefined`).
- **`'lets only the staff action on orders onto the staff page'`** — asserts `SalesOrders` requires `display:Order` (not the broader `read:Order`), while `OrdersList` carries no `can` constraint.
- **`'gives each of the two list routes its scope'`** — pins `props.scope` to `'mine'` vs `'all'` for the two list routes.
- **`'declares no route this file does not know about'`** — completeness guard: the set of route names must exactly match the four expected names, catching any newly added route that lacks an access decision.

## Relationships

- **`src/modules/orders/routes.ts`** — the sole production import; the spec reads the raw `RouteRecordRaw[]` array directly (not a resolved router), so no locale prefix or app bootstrap is needed.

## Notes

- Tests **declarations** (`meta` is present and correct), not **enforcement** (that a guard actually blocks). Enforcement is covered by the router-level spec.
- The file lives inside the `orders` domain module by design (see `docs/theory/modules.md`): these are domain-specific facts, and deleting the domain should not break a platform-level spec.
- `meta.can` is asserted as a two-element array `[action, subject]` when present, or strict `undefined` when absent — not as an object.
