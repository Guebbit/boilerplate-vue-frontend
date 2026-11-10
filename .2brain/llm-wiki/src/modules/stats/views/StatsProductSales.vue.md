---
source: src/modules/stats/views/StatsProductSales.vue
sha256: 60ac1d2c0303cbe09b96b5deaa430f3e9a375ae9cac88e930302e18e12972406
signature: da353dd620d77c911216df1250f92f315a5fcce9967ff81b627e241cd49dc22d
generated_at: 2026-11-10T05:54:01.147693+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/views/StatsProductSales.vue

## Purpose

Renders a single product's sales-over-time view: a bar-and-line chart of units ordered and reversed per time bucket, a period selector, and a conditional link to the filtered staff orders list. The period is carried in the URL query (so links are shareable) or defaults to the last 30 days.

## Key elements

- **`load()`** – Syncs the current period into the URL query (`router.replace`), then calls `stats.loadProductSales(productId, period)`. Catches failures into a local blocking-error state.
- **`applyPeriod(next)`** – Updates the local `period` ref and re-invokes `load()`.
- **`chart`** (`computed<ChartModel>`) – Maps the store's buckets into a `ChartModel` with one bar series (`unitsOrdered`) and one line series (`unitsReversed`), formatting bucket labels via `formatBucketStart`.
- **`soldNothing`** (`computed`) – Indicates whether every bucket has zero units ordered and zero units reversed; drives the empty-state hint in the template.
- **`ordersLink`** (`computed`) – Builds a route link to `SalesOrders` scoped by `productId`, `paidFrom`, `paidTo`; returns `undefined` when that route is not registered in the current build.
- **`productTitle`** (`computed`) – The product name frozen in the series, falling back to the raw `productId` prop.
- **`period`** (`ref<StatsPeriodChoice>`) – Initialized from `route.query` via `periodFromQuery`; the single source of truth for the displayed window.
- **`useBlockingError()`** – Provides `loadError`, `reportLoadError`, `clearLoadError` for the load-specific error banner.

## Relationships

- **`src/modules/stats/store.ts`** – Consumes `useStatsStore()` for `productSeries` (via `storeToRefs`) and calls `loadProductSales`; passes `stats.limits` to the period form.
- **`src/modules/stats/domain/index.ts`** – Imports `periodFromQuery` and the `ChartModel` / `StatsPeriodChoice` types.
- **`src/modules/stats/components/ChartWithTable.vue`** – Renders the computed `chart` model with `kind="xy"`.
- **`src/modules/stats/components/StatsPeriodForm.vue`** – Emits `@apply` to trigger `applyPeriod`; receives the current period value and store limits.
- **`src/modules/stats/tests/views.spec.ts`** – Tests targeting this view's rendering and behavior.

## Notes

- The period is written back to the URL on every load (`router.replace`), so a page refresh or a copied link reproduces the same query.
- `ordersLink` is gated by `linkIfRouted`: in builds that do not ship the orders module the "View orders" button is simply absent.
- The separate `<script>` block exists solely to set the component `name` for devtools / `<KeepAlive>`, since `<script setup>` cannot declare one.
- `soldNothing` requires *all* buckets to be zero in both dimensions; a single non-zero bucket suppresses the empty-state message.
