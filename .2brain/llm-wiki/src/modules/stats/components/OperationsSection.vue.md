---
source: src/modules/stats/components/OperationsSection.vue
sha256: 85df9059b129ef7d640e20aceec31fd44393da6b0f2fb64cda0ed21122c7be60
signature: a174fa695d391c1218ef246b66c553498771880977b8e48ef4758e1992ab1e8c
generated_at: 2026-11-10T05:46:24.177273+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/components/OperationsSection.vue

## Purpose

Presentational section of the stats dashboard that words and formats operational API data: payment mix (per-currency pie charts), cancellation/return/refund rates, new-vs-returning customer counts, and pipeline status (awaiting transfers, paid-not-shipped). It performs no fetching or mutation — every number arrives via props.

## Key elements

- **`OperationsSection`** (named export) — stable component name for `<KeepAlive>` and DevTools; required because `<script setup>` cannot declare one.
- **Props** — four optional objects (`paymentMix`, `operations`, `customers`, `pipeline`), each corresponding to a `GET /stats/*` endpoint response.
- **`mixCharts`** (computed) — groups `paymentMix.rows` by currency (via `Set`), producing one `ChartModel` per currency with a single bar series of payment counts and labels of `method · provider`.
- **Template** — renders a grid of `CardMaterialStat` widgets (cancellation, returns, per-currency refunds, customer counts, returning rate, awaiting transfers, paid-not-shipped) followed by one `ChartWithTable` (kind `"pie"`) per `mixCharts` entry. Falls back to a `no-data` paragraph when both `paymentMix` and `operations` are absent.

## Relationships

- **src/modules/stats/views/StatsDashboard.vue** (parent) — renders `<OperationsSection>` and passes the four API response objects as props.
- **src/modules/stats/components/ChartWithTable.vue** — child component; receives each `ChartModel` from `mixCharts` and renders the pie chart + accompanying table.
- **src/modules/stats/domain/chart.ts** — source of the `ChartModel` type that `mixCharts` produces and `ChartWithTable` consumes.
- **src/modules/stats/domain/index.ts** — barrel re-export of `domain/chart.ts` through which `ChartModel` is imported.
- **src/modules/stats/tests/sections.spec.ts** — unit-test suite covering this component's rendering and `mixCharts` logic.

## Notes

- All four props are optional; the component gracefully degrades (individual `v-if` guards per group, plus an explicit empty-state paragraph when the two primary props are both missing).
- `mixCharts` relies on `Set` to deduplicate currencies — row order within a currency group is preserved, but cross-currency order follows first-appearance.
- `v-for` loops on `operations.refunds` and `pipeline.awaitingTransfers` are keyed by `currency`, so the API must not return duplicate currency entries in those arrays.
- Every user-visible string goes through `t()` (vue-i18n); there are no hardcoded labels.
