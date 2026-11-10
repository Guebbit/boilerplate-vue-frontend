---
source: src/modules/stats/views/StatsDashboard.vue
sha256: 2b0eed8b54aecb5087db44ae3c7d693d0c27e83ddf682cdb53dd1eec8f42b8d3
signature: a24e540e850afb2ab2065eee2412c8db40aa4ba1061bf1b0fa34f044c00073ae
generated_at: 2026-11-10T05:53:28.656580+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/views/StatsDashboard.vue

## Purpose
Top-level dashboard view for the stats module. Owns the selected `StatsPeriodChoice` and the single `loadDashboard` call, then passes the resulting store state down to three section components. It is the only route in the app where Mermaid is lazily imported (inside a child chart).

## Key elements
- **Named `<script>` block** (`StatsDashboardPage`) — provides a stable `name` for devtools and `<KeepAlive>`; `<script setup>` alone cannot declare one.
- **`period` (ref)** — current period, initialised from the route query via `periodFromQuery`.
- **`load()`** — calls `stats.loadDashboard(period.value)`; on failure, records the error via `useBlockingError` rather than a transient toast.
- **`applyPeriod(next)`** — updates the `period` ref and fires an un-awaited `load()` (the floating-promise is intentional; `load` handles its own error path).
- **`storeToRefs(stats)`** — destructures `sales`, `products`, `categories`, `paymentMix`, `operations`, `customers`, `pipeline`, and `loading` as reactive refs for template binding.
- **`useBlockingError`** — yields `loadError`, `reportLoadError`, `clearLoadError`; renders a persistent `InlineErrorAlert` above the sections instead of a fading toast.
- **`onMounted`** — triggers the initial `load()`.

## Relationships
- **`src/modules/stats/store.ts`** — `useStatsStore()` supplies `loadDashboard` and all reactive data fields; this page is the sole caller of `loadDashboard`.
- **`src/modules/stats/domain/index.ts`** — barrel re-export providing `periodFromQuery` and the `StatsPeriodChoice` type used to seed and type the `period` ref.
- **`src/modules/stats/domain/period.ts`** — defines the `StatsPeriodChoice` type and `periodFromQuery` helper consumed through the barrel above.
- **`src/modules/stats/components/StatsPeriodForm.vue`** — renders the period picker; this page passes `model-value` + `limits` and listens for its `apply` event to call `applyPeriod`.
- **`src/modules/stats/components/SalesSection.vue`** — receives the `sales` object and renders the sales block (including the Mermaid chart).
- **`src/modules/stats/components/ProductsSection.vue`** — receives `products`, `categories`, and `period` for the product/category breakdown.
- **`src/modules/stats/components/OperationsSection.vue`** — receives `paymentMix`, `operations`, `customers`, `pipeline` for the operations block.
- **`src/modules/stats/tests/views.spec.ts`** — unit/integration tests targeting this component's rendering and interaction logic.
- **`src/infrastructure/utils/logger.ts`** — used indirectly through the error-reporting chain (`useBlockingError` / store) to log load failures.

## Notes
- The page uses `useBlockingError` (a persistent inline alert) instead of a toast because the dashboard is non-functional without data; the error must remain visible until the user retries.
- `void load()` calls carry explicit `eslint-disable` comments for `@typescript-eslint/no-floating-promises` — the promise is deliberately not awaited because `load` internally catches and surfaces its own failure.
- The module doc comment states Mermaid is imported *only* when a chart mounts inside a child section, keeping the initial bundle free of that dependency.
- `data-test` attributes (`stats-load-error`, `stats-time-zone`, `stats-limits`) are stable hooks for the e2e suite.
