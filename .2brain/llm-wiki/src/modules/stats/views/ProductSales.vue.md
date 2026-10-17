---
source: src/modules/stats/views/ProductSales.vue
sha256: 32be4ff9a7b5e63bf027ed1c5052c9605f66974319dc25485a5675dc5caaf1c6
generated_at: 2026-10-17T01:45:05.417270+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/views/ProductSales.vue

## Purpose

Vue single-file component that renders a single product's sales-over-time page. It displays ordered and reversed unit counts per time bucket as a combined bar/line chart, lets the user adjust the period via a form, and offers a link to the filtered staff-orders list. The product is identified by the `productId` route prop; the period is read from the URL query (defaulting to the last 30 days) so the view is fully reconstructable from a shared link.

## Key elements

- **`load()`** — Clears prior errors, syncs the current period into the URL query (`router.replace`), calls `stats.loadProductSales(productId, period)`, and surfaces any rejection through `useBlockingError`.
- **`applyPeriod(next)`** — Entry point for the `StatsPeriodForm` `@apply` event; stores the new period and re-triggers `load()`.
- **`productTitle`** (computed) — Prefers the title frozen by the store's series; falls back to the raw `productId` when the product sold nothing.
- **`chart`** (computed → `ChartModel`) — Maps the store's buckets into labels (via `bucketLabel` + locale/timezone) and two series: a bar series for `unitsOrdered` and a line series for `unitsReversed`.
- **`soldNothing`** (computed) — True when every bucket has zero ordered *and* zero reversed units; drives a "sold nothing" notice in the template.
- **`ordersLink`** (computed) — Builds a guarded route link to the `SalesOrders` view pre-filtered by `productId`, `paidFrom`, `paidTo`; returns `undefined` when the orders module is absent from the build.
- **Named block (`ProductSalesPage`)** — Separate `<script>` (non-setup) that sets the component `name` for devtools / `<KeepAlive>` compatibility.

## Relationships

- **`../store.ts`** — Consumes `useStatsStore` and its `productSeries` ref (via `storeToRefs`) to obtain the loaded bucket data and period metadata.
- **`../domain` (`index.ts`, re-exports `period.ts`, `chart.ts`, `series.ts`)** — Imports `bucketLabel`, `periodFromQuery`, and the `ChartModel` / `StatsPeriodChoice` types used throughout the component.
- **`../components/StatsPeriodForm.vue`** — Rendered in the template; emits `@apply` which the component wires to `applyPeriod`.
- **`../components/ChartWithTable.vue`** — Receives the computed `ChartModel` and renders the chart-plus-table visualization.
- **`../tests/views.spec.ts`** — Test suite that exercises this view's rendering and behavior.

## Notes

- The component is designed to be **fully URL-deterministic**: the period lives in the query string, so a reload or shared link reproduces the same view without extra state.
- `ordersLink` uses `linkIfRouted`, meaning the "View orders" button is **conditionally absent** in builds that don't ship the orders module — no runtime error, the button simply doesn't render.
- The `chart` computed falls back to `period.value.interval` and `'UTC'` when the store's series is still `null`, so the first render before data arrives won't crash on undefined metadata.
- `data-test` attributes are present on every interactive/assertable element; the test spec keys off these rather than text content.
