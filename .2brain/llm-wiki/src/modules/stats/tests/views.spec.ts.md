---
source: src/modules/stats/tests/views.spec.ts
sha256: c9d4a65e35ee8b84fd6cdefd944a65e44fc8cdd94e2279fa90f93259ecb9cd6f
signature: eef24ff720c666f7153a1b0931eb9add7d8c2dd25fb99cd363c9687309a98481
generated_at: 2026-11-10T05:53:02.048107+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/tests/views.spec.ts

## Purpose
Integration-level Vitest spec for the two stats page views (`StatsDashboard`, `StatsProductSales`). It mounts each page against a real router, a fresh Pinia store (with its load methods stubbed), Vuetify, and i18n, then asserts on the period passed to the store, error rendering, link targets, and empty-state display. The composable blocks these pages use have their own dedicated specs.

## Key elements
- **`makeRouter()`** – Builds a memory-history router containing the full module route tree (`collectModuleRoutes(enabledModules)`) plus a stub `SalesOrders` route the stats pages link to.
- **`MermaidStub`** – A minimal component (`<pre data-test="stub-chart" />`) that replaces `MermaidChart` so no real chart renders in tests.
- **`SERIES`** – A `ProductSeries` fixture (product "p1", one bucket, `timeZone: 'Europe/Rome'`) reused across product-page tests.
- **`mountDashboard(router, url?)`** – Navigates the router, mounts `StatsDashboard` with plugins/stubs, flushes promises, and returns the settled wrapper.
- **`mountProduct(router, url)`** – Same pattern for `StatsProductSales`, passing `productId: 'p1'` as a prop.
- **`answerProductWith(series)`** – Stubs `useStatsStore().loadProductSales` to set `store.productSeries` and resolve with the given series; returns the spy for call assertions.
- **`describe('StatsDashboard')`** – Four tests: default 30-day period, URL-carried period, preset re-trigger, and failure alert rendering.
- **`describe('StatsProductSales')`** – Four tests: product title from series, "view orders" link with query params, sold-nothing empty state, and URL query staying in sync with the displayed period.

## Relationships
- **`src/modules/stats/store.ts`** – Imports `useStatsStore`; each test stubs either `loadDashboard` or `loadProductSales` and asserts on the arguments the page passes in.
- **`src/modules/stats/views/StatsDashboard.vue`** – Component under test in the first `describe` block.
- **`src/modules/stats/views/StatsProductSales.vue`** – Component under test in the second `describe` block.
- **`tests/support/unit/fixtures.ts`** – Provides `aProblem` to construct the 500-error object used in the failure-rendering test.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called once at module scope so that `collectModuleRoutes` (invoked inside `makeRouter`) sees the modules registered.

## Notes
- `wireModulesIntoCore()` runs at import time (top-level), not inside `beforeEach`; it is a one-shot side-effect that populates the module registry before any router is built.
- The `SalesOrders` route in `makeRouter` is a placeholder (`component: RouterView`); the stats module only produces a link to it and never renders it, so a real orders component is unnecessary.
- Store state is reset per test via `setActivePinia(createPinia())` in `beforeEach`, but the spies are created per-test (inside each `it`), not shared.
- The `SERIES` fixture's single bucket timestamp (`2026-09-30T22:00:00Z`) maps to Oct 1 in `Europe/Rome`, matching the stated `from` date—useful context if bucket-boundary logic is ever asserted more precisely.
