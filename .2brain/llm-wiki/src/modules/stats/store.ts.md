---
source: src/modules/stats/store.ts
sha256: fafdceff75b7b98fbc1fde392e7b5c6fd808a86be386d43646ec06f77f467009
generated_at: 2026-10-17T01:42:45.457414+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/store.ts

## Purpose

Pinia store that holds the live answers for the sales dashboard (seven endpoint blocks) and the product drill-down page (one time-series). It fires the requests, stores each response verbatim, and exposes a shared `loading` flag. It performs no arithmetic or currency conversion — it is a thin "last answer" holder over the API.

## Key elements

- **`useStatsStore`** — the store (`'stats'`). Exposes `loading` plus eight refs (`sales`, `products`, `categories`, `paymentMix`, `operations`, `customers`, `pipeline`, `productSeries`) and two actions.
- **`loadDashboard(period: StatsPeriodChoice)`** — fires all seven dashboard GETs in parallel via `Promise.all`; each response is assigned to its ref as it lands. Resolves `undefined` when all succeed; rejects on the first failure (already-answered blocks keep their new values). `pipeline` is a period-less "now" snapshot.
- **`loadProductSales(productId, period)`** — fetches one product's units-over-time series and stores it in `productSeries`. Resolves with the series data.
- **`TOP_PRODUCTS`** — module-level constant (`10`); the `limit` passed to `getProductStats`.
- **`fetchAny` / `loading`** — provided by `useStructureRestApi` (`@guebbit/vue-toolkit`), bound to a shared `queryClient`. Every read goes through this runner.

## Relationships

- **`src/modules/stats/domain/index.ts`** — imports the `StatsPeriodChoice` type used as the `period` parameter on both actions.
- **`src/modules/stats/domain/period.ts`** — (via `domain/index.ts`) defines the shape of `StatsPeriodChoice` (`{ from, to, interval }`).
- **`src/modules/stats/views/StatsDashboard.vue`** — calls `loadDashboard` and reads all seven block refs to render the dashboard.
- **`src/modules/stats/views/ProductSales.vue`** — calls `loadProductSales` and reads `productSeries` for the drill-down chart.
- **`src/modules/stats/tests/store.spec.ts`** — unit-tests the store's actions and ref assignments.
- **`src/modules/stats/tests/views.spec.ts`** — integration-tests the two views, which exercise this store.

## Notes

- **No cross-period caching.** The API intentionally sends `no-store`; the store keeps only the most recent answer per block. Navigating to a new period overwrites everything.
- **Partial-failure semantics in `loadDashboard`.** Because each `.then` assigns before `Promise.all` settles, blocks that answered before a sibling fails retain their new values. The caller sees a rejection but the UI may show a mix of fresh and stale data.
- **No arithmetic here.** Money is kept per-currency exactly as the endpoint returns it. Any derived metric (e.g., "net sales") must live in the API or a domain helper, not in this store.
- **`pipeline` is period-independent.** It represents a "right now" snapshot (pending transfers, unshipped paid orders) and receives no `from`/`to`/`interval` params.
