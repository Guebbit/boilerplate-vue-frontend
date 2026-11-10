---
source: src/modules/stats/store.ts
sha256: 0d67c0ef84c5134cf1fe929675cb976de36a440f9cd8e8f580e3d33ae18d5a08
signature: 306d8b17651925a00ca9089c2684ecdf04ad20dc92e26fc84ed14afc67ef2c02
generated_at: 2026-11-10T05:49:58.521718+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/store.ts

## Purpose

Pinia store (setup syntax) that holds the last API answer for each block of the sales dashboard plus one product's time-series for the drill-down page. It exposes two actions—`loadDashboard` (fires all seven GETs in parallel for a chosen period) and `loadProductSales` (fetches one product's series)—and nothing else. No values are cached across periods; the API deliberately sends `no-store` because the data represents live shop takings.

## Key elements

- **`useStatsStore`** — the exported Pinia store (`defineStore('stats', …)`).
- **`loading`** — shared boolean from `useStructureRestApi`; true while any stats request is in flight.
- **Seven block refs** (`sales`, `products`, `categories`, `paymentMix`, `operations`, `customers`, `pipeline`) — each typed to its API response; `undefined` until the first answer lands.
- **`productSeries`** — one product's units-over-time, for the drill-down view.
- **`limits`** — the period ceilings the API echoes in every period answer; `undefined` until then.
- **`takeLimits<T>(response)`** — internal helper that lifts `.limits` off a period response into the `limits` ref and returns the response unchanged.
- **`loadDashboard(period: StatsPeriodChoice)`** — fires the seven GETs via `Promise.all`; resolves `undefined` on success, rejects on the first failure (already-answered blocks retain their new values).
- **`loadProductSales(productId, period)`** — fetches a single product's series; resolves with the stored value.
- **`TOP_PRODUCTS`** (const 10) — limit passed to the top-products endpoint.

## Relationships

- **`src/modules/stats/domain/index.ts`** — type-only import of `StatsPeriodChoice`, the period shape used by both actions.
- **`src/modules/stats/domain/period.ts`** — underlying definition behind the `StatsPeriodChoice` type (re-exported through `domain/index.ts`).
- **`src/modules/stats/views/StatsDashboard.vue`** — consumer: reads the seven block refs and calls `loadDashboard`.
- **`src/modules/stats/views/StatsProductSales.vue`** — consumer: reads `productSeries` and calls `loadProductSales`.
- **`src/modules/stats/tests/store.spec.ts`** — unit tests for this store.
- **`src/modules/stats/tests/views.spec.ts`** — tests the two views that consume the store.

## Notes

- **No arithmetic, no currency conversion.** The store stores exactly what each endpoint returns (money grouped per currency) and performs no aggregation; a second implementation of "net sales" would risk disagreeing with the invoices.
- **`pipeline` is a point-in-time snapshot.** `loadDashboard` calls `getPipelineStats()` with no period arguments, and it does *not* go through `takeLimits`—it is the only block that bypasses the shared `limits` extraction.
- **Partial update on failure.** Because the seven calls run in a `Promise.all`, a single rejection rejects the whole promise, but any block that already resolved keeps its newly assigned value. There is no rollback.
- **`fetchAny` / `queryClient` coupling.** All requests are routed through `useStructureRestApi` with a shared `queryClient` from `@/infrastructure/query-client.ts`; the store does not call `fetch` or the `@api` functions directly outside the `fetchAny` wrapper.
