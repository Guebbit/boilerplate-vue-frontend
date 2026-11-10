---
source: src/modules/stats/routes.ts
sha256: 5b29c4cffabbb23f3e6486afbe3f35e86843fb779096906e9d2d5e8c20ada3eb
signature: 5b29c4cffabbb23f3e6486afbe3f35e86843fb779096906e9d2d5e8c20ada3eb
generated_at: 2026-11-10T05:49:28.877882+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/routes.ts

## Purpose

Defines the two route records for the stats domain (a general dashboard and a per-product sales view). Both views are lazy-loaded via dynamic `import()` so the chart library they depend on is fetched only when a user actually navigates to one of the pages.

## Key elements

- **default export** — An array of two `RouteRecordRaw` entries, type-checked with `satisfies RouteRecordRaw[]`.
  - `StatsDashboard` (`/sales/stats`) → lazy-imports `./views/StatsDashboard.vue`.
  - `StatsProductSales` (`/sales/stats/products/:productId`) → lazy-imports `./views/StatsProductSales.vue`; sets `props: true` so the `:productId` route param is injected as a component prop.
- Both routes carry `meta: { access: 'auth', can: ['read', 'Stats'] }`, meaning an authenticated user with the `read:Stats` permission (granted to manager/admin roles server-side) may access them.

## Relationships

- **`src/modules/stats/module.ts`** — Imports the default export from this file to register the two routes with the Vue Router instance for the stats module.
- **`src/modules/stats/tests/routes.spec.ts`** — Unit-test file that exercises the route table (paths, names, meta, lazy-load shape).

## Notes

- The permission is expressed as the two-element array `['read', 'Stats']` in `meta.can`, not a string. Ensure any router guard that consumes this meta splits the array into the `action` + `subject` pair.
- `props: true` is only set on `StatsProductSales`; the dashboard route has no dynamic params and omits it.
- Titles reference i18n keys (`stats-page.page-title`, `stats-page.product-sales-title`) rather than literal strings.
