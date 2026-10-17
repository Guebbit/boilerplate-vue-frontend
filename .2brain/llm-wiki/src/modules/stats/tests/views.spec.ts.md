---
source: src/modules/stats/tests/views.spec.ts
sha256: 6fee45b719b602f58d754995d10bcf22f8787b1b2286332dae08c9dd25c4d66a
generated_at: 2026-10-17T01:44:50.577819+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/tests/views.spec.ts

## Purpose

Page-level integration tests for the two stats views (StatsDashboard and ProductSales). Verifies which store method fires on load, with what period (URL-driven or default), how a failed load is surfaced, and what the product page links to. Sub-block rendering is covered by their own specs.

## Key elements

- **`makeRouter()`** – Builds a memory-history router from the real module route table (`collectModuleRoutes`) plus a stub `SalesOrders` route so link assertions have a target.
- **`MermaidStub`** – Minimal component replacing `MermaidChart` so no chart rendering is exercised.
- **`SERIES`** – Fixture `ProductSeries` (one bucket, 3 ordered / 1 reversed) used by ProductSales tests.
- **`mountDashboard(router, url?)`** – Pushes the URL, mounts `StatsDashboard` with router/vuetify/i18n plugins and the Mermaid stub, then awaits `flushPromises`.
- **`mountProduct(router, url)`** – Same pattern for `ProductSales`, passing `productId: 'p1'` as a prop.
- **`answerProductWith(series)`** – Spies on `useStatsStore().loadProductSales`, mocks it to set `store.productSeries` and resolve with the given series.
- **`describe('StatsDashboard')`** – 4 tests: default 30-day period, URL-carried period, preset-click reload, and error alert rendering.
- **`describe('ProductSales')`** – 4 tests: period + title from URL, orders-link query params, empty-bucket "sold nothing" state, and router query staying in sync.

## Relationships

- **`src/modules/stats/store.ts`** – `useStatsStore` is spied on (`loadDashboard`, `loadProductSales`) to stub network-backed reads and assert call arguments.
- **`src/modules/stats/views/StatsDashboard.vue`** – Under test; mounted directly with its plugin stack.
- **`src/modules/stats/views/ProductSales.vue`** – Under test; mounted with a `productId` prop.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module top-level so the kernel registry knows about the stats module's routes before `makeRouter()` collects them.

## Notes

- The store is **not** a full Pinia mock; a real Pinia is created in `beforeEach`, and only specific methods are spied. This means the store's state shape must match what the views read.
- Element targeting uses `data-test` attributes exclusively—no reliance on generated class names or component structure.
- The "sold nothing" test asserts that when `title` is `undefined`, the view falls back to displaying the raw `productId` in the `[data-test=product-title]` slot.
- `loadLocale('en')` is awaited in `beforeEach`; tests assume English strings.
- The orders-page route in `makeRouter` is a bare `RouterView` placeholder—only its path/name matter for link-href assertions.
