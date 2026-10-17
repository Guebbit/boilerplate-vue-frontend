---
source: src/modules/stats/components/OperationsSection.vue
sha256: f6547f7050dd83beee1b50982d93253dc5c4d491a293dfcf1c2764db1b314dbe
generated_at: 2026-10-17T01:40:15.488976+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/components/OperationsSection.vue

## Purpose

Presentational section of the stats dashboard that displays operational KPIs — cancellation, return, and refund rates, new vs. returning customers, pipeline waiting amounts, and per-currency payment-method mix. It formats and labels API-provided numbers but performs no data fetching or mutation of its own.

## Key elements

- **`props`** – four optional objects (`paymentMix`, `operations`, `customers`, `pipeline`), each mapping to a distinct `GET /stats/*` endpoint response.
- **`mixCharts` (computed)** – transforms `paymentMix.rows` into one `ChartModel` per unique currency, grouping rows by currency and building `labels` from method + provider pairs.
- **Template** – renders a grid of `CardMaterialStat` components (cancellation, returns, refunds per currency, customers, returning-rate, awaiting-transfers per currency, paid-not-shipped) followed by a `ChartWithTable` (kind `"pie"`) per `mixCharts` entry.
- **Empty state** – a single `<p data-test="operations-empty">` shown when both `paymentMix` and `operations` are absent.
- **Named block (`<script>`)** – exports `name: 'OperationsSection'` for `<KeepAlive>` / devtools; required because `<script setup>` cannot declare a component name.

## Relationships

- **`ChartWithTable.vue`** – consumed in the template via `v-for` over `mixCharts`; each instance receives a `ChartModel`, `kind="pie"`, and a label title.
- **`domain/index.ts` / `domain/chart.ts`** – source of the `ChartModel` type used to shape `mixCharts`.
- **`StatsDashboard.vue`** – parent view; supplies the four prop objects and likely wraps this section in a layout.
- **`tests/sections.spec.ts`** – exercises this component; the `data-test` attributes (`stats-operations`, `card-cancellation`, `card-refund-rate`, `operations-empty`, etc.) are the stable hooks the spec relies on.

## Notes

- All user-facing text goes through `t()` from `vue-i18n`; i18n keys follow the `stats-page.*` prefix. New labels require a matching key in the locale files.
- Refunds and awaiting-transfers are rendered with `v-for` keyed by `currency`, so the API is expected to return one entry per currency; a missing `nearestPayBy` on an awaiting-transfer row silently falls back to a count-only subtitle.
- The component is intentionally dumb: it does not call any composable or store for data, making it safe to render under `<KeepAlive>` without side-effect concerns.
- `data-test` attributes are the contract with `sections.spec.ts`; renaming or removing them will break those tests.
