---
source: src/modules/stats/routes.ts
sha256: 2b74b22f92d00d37be0606ed7388f38cc36211e7fc4c644f00794da27e1fa1b3
generated_at: 2026-10-17T01:42:34.577945+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/routes.ts

## Purpose
Defines the two Vue Router records for the stats domain (a general dashboard and a per-product sales page). Both views are lazy-loaded so the chart library is fetched only when the user actually navigates to a stats page.

## Key elements
- **Default export** — an array satisfying `RouteRecordRaw[]` with two entries:
  - `StatsDashboard` (`/sales/stats`) → lazy-loads `./views/StatsDashboard.vue`.
  - `StatsProductSales` (`/sales/stats/products/:productId`) → lazy-loads `./views/ProductSales.vue`; `props: true` passes `:productId` as a component prop.
- **`meta` on both routes** — `access: 'auth'` (authenticated session required) and `can: ['read', 'Stats']` (server-side permission check). Titles reference i18n keys under the `stats-page` namespace.

## Relationships
- **`src/modules/stats/module.ts`** — consumes this default-exported route array to register the stats routes in the application router.
- **`src/modules/stats/tests/routes.spec.ts`** — unit-tests the route definitions (paths, names, meta, prop passthrough) exported here.

## Notes
- Access model: `read:Stats` is a plain staff action (no own-rows scoping), so both manager and admin can open either page. There is no per-user data isolation at the route level.
- The `props: true` on the product route means the view component must declare a `productId` prop; renaming the param without updating the view will silently break it.
- The `satisfies` keyword keeps full `RouteRecordRaw` type-checking without widening the exported type—important if downstream code relies on the literal `meta` shape.
