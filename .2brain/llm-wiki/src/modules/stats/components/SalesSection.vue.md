---
source: src/modules/stats/components/SalesSection.vue
sha256: e14cefa7ba701d93039820045b183840b866e315a0a9295a0181e6070dea6113
signature: c6fa68867de149808d16625620fe08f8b1751769a949c14bc55791fb2ae6c14f
generated_at: 2026-11-10T05:47:11.034765+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/components/SalesSection.vue

## Purpose

Presentational Vue SFC that renders the sales section of the stats dashboard: one block per currency containing headline stat cards (with period-over-period change), two over-time charts (total sales as bars, orders as a line), and a detailed revenue table. It formats pre-computed API figures and exports CSV; it performs no aggregation of its own.

## Key elements

- **`CARD_FIELDS`** – `as const satisfies` array of the six stat cards (totalSales, netSales, orders, averageOrderValue, netUnits, refunds) with their i18n keys and a `money` flag that controls `formatCurrency` vs. raw string.
- **`figureNumber`** – Coerces a money string or count to `number`; used only to feed `percentChange`, never for display.
- **`groups`** (computed) – Maps `props.sales.currencies` into `{ group, cards, charts }` objects ready for the template loop.
- **`changeText`** – Turns a `percentChange` fraction (or `undefined`) into a localized "no prior / flat / ±X% vs. previous" sentence.
- **`chartsOf`** – Builds two `ChartModel` objects from a currency's buckets: a bar chart for total sales and a line chart for orders, with localized labels/titles and `Number()` applied only at the chart-series boundary.
- **`COLUMNS`** – `as const satisfies` array defining the seven revenue-table columns (orders, gross, reversals, net, taxes, shipping, total).
- **`downloadRevenue`** – Serialises one currency's bucket rows to CSV via `toCsv` and triggers a download through `downloadBlob` from `@guebbit/js-toolkit`.
- **Template** – Per-currency `<section>` with `CardMaterialStat` cards, two `ChartWithTable` children, a Vuetify `v-table` for the revenue breakdown, and a "Download CSV" button. Includes an empty-state paragraph when `sales` is absent or has no currencies.

## Relationships

- **`src/modules/stats/components/ChartWithTable.vue`** – Child component; receives a `ChartModel` and renders the chart + its companion table (used twice per currency group).
- **`src/modules/stats/domain/index.ts`** – Barrel from which `isFlat`, `percentChange`, and `toCsv` are imported.
- **`src/modules/stats/domain/chart.ts`** – Source of the `ChartModel` type that shapes the data passed to `ChartWithTable`.
- **`src/modules/stats/domain/csv.ts`** – Provides `toCsv`, the CSV serialiser used by `downloadRevenue`.
- **`src/modules/stats/domain/figures.ts`** – Provides `isFlat` and `percentChange` helpers for the card subtitles.
- **`src/modules/stats/views/StatsDashboard.vue`** – Parent view; supplies the optional `sales: SalesStats` prop.
- **`src/modules/stats/tests/sections.spec.ts`** – Unit/integration tests that exercise this component's rendering and CSV logic.

## Notes

- **Money values are strings** from the API. `Number()` is applied only at the chart-series boundary and for `percentChange` arithmetic; display paths always use the original string through `formatCurrency`.
- **Dual `<script>` blocks** are intentional: the plain block declares `name: 'SalesSection'` (needed for `<KeepAlive>` / devtools), while all logic lives in `<script setup>`.
- **`downloadRevenue` reuses `charts.sales.labels`** for the CSV period column, so the exported file's first column matches exactly what the screen shows.
- **`sales` prop is optional** (`sales?: SalesStats`); the component renders a "no data" message when it is `undefined` or contains zero currency groups.
- **`v-focusable-scroll`** directive is applied to the revenue table to support keyboard-navigable scrolling with a labelled fallback.
