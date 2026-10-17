---
source: src/modules/stats/views/StatsDashboard.vue
sha256: d376f5e55e9c83d414c4c6d54723105e26eec3d181858c195ef66aed6e97537e
generated_at: 2026-10-17T01:45:19.071058+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/views/StatsDashboard.vue

## Purpose

Top-level page component for the sales statistics route. It owns the selected reporting period and the single `loadDashboard` fetch, then delegates pure rendering to three section components. It exists so that the period state, the loading lifecycle, and the blocking-error UX live in one place rather than being scattered across child blocks.

## Key elements

- **Component name block (`export default { name: 'StatsDashboardPage' }`)** — Provides a stable name for devtools and `<KeepAlive>`; required because `<script setup>` cannot declare one.
- **`period` (ref)** — Current `StatsPeriodChoice`, seeded from the route query via `periodFromQuery`.
- **`load()`** — Clears any prior blocking error, calls `stats.loadDashboard(period.value)`, and routes failures into the `useBlockingError` state.
- **`applyPeriod(next)`** — Updates `period` and fires `load()`.
- **`storeToRefs` destructuring** — Exposes `sales`, `products`, `categories`, `paymentMix`, `operations`, `customers`, `pipeline`, `loading` as reactive refs for the template.
- **`useBlockingError`** — Replaces a transient toast with a persistent inline alert (rendered as `<InlineErrorAlert>`) because the page is unusable without its data.
- **Template** — Renders `StatsPeriodForm`, the blocking error alert, an optional time-zone label (read from `sales.period.timeZone`), a Vuetindeterminate progress bar while `loading`, the three section components, and a static "limits" note.

## Relationships

- **`src/modules/stats/store.ts`** — Consumes `useStatsStore`; calls `loadDashboard` and reads all section data plus `loading` through `storeToRefs`.
- **`src/modules/stats/domain/index.ts`** — Imports `periodFromQuery` (query-string → `StatsPeriodChoice`) and the `StatsPeriodChoice` type. The domain barrel re-exports from `period.ts`.
- **`src/modules/stats/components/StatsPeriodForm.vue`** — Bound via `model-value`/`@apply`; emits the chosen period back to the page.
- **`src/modules/stats/components/SalesSection.vue`** — Receives `:sales`; renders revenue figures.
- **`src/modules/stats/components/ProductsSection.vue`** — Receives `:products`, `:categories`, `:period`; renders product breakdowns.
- **`src/modules/stats/components/OperationsSection.vue`** — Receives `:payment-mix`, `:operations`, `:customers`, `:pipeline`; renders operational metrics.
- **`src/modules/stats/tests/views.spec.ts`** — Integration/unit tests that mount this page and assert on its rendered output and store interactions.

## Notes

- The page is the **only** place in the stats module where the load is triggered; child sections are strictly presentational and do not call the store themselves.
- The time-zone label is derived from `sales.period.timeZone` at render time, not from the period ref—so it only appears once `sales` data has landed.
- `periodFromQuery` is called once at setup with `new Date()` as fallback; it does not react to later route changes (the period is controlled by the form, not the URL, after mount).
- The blocking-error pattern (`useBlockingError`) is deliberately distinct from `useToast`-style errors: it persists above the content until the next successful load.
