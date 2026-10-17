---
source: src/modules/stats/components/SalesSection.vue
sha256: 09b9a4f9287c2944bf8b7b84e10221eb8c814a72ee0d51aae105a2a16c5c80ff
generated_at: 2026-10-17T01:40:43.505082+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/components/SalesSection.vue

## Purpose

Presentational SFC that renders the **sales** section of the stats dashboard. For each currency group supplied by the API it displays a row of headline stat cards (with period-over-period change), two over-time charts (total-sales bar, orders line), and a per-bucket revenue table with a CSV download. It formats and lays out data the backend already aggregated; it performs no sums of its own.

## Key elements

- **`props.sales`** (`SalesStats | undefined`) — the single input, the raw response from `GET /stats/sales`. When absent or empty the component shows a "no data" message.
- **`CARD_FIELDS`** — readonly, six-entry array defining which `SalesFigures` keys appear as stat cards and whether each is money-formatted. Drives the card grid per currency.
- **`groups`** (computed) — maps each `SalesCurrency` into `{ group, cards, charts }` for direct template iteration.
- **`changeText(change)`** — converts a fractional change (or `undefined`) into a localized sentence ("+12 % vs previous", "No previous data", etc.).
- **`chartsOf(group)`** — builds two `ChartModel` objects (bar for total sales, line for orders) with shared bucket labels derived from `bucketLabel`.
- **`COLUMNS`** — readonly array of seven revenue-table column keys (orders → totalSales) used by both the `<v-table>` and the CSV export.
- **`downloadRevenue(group, labels)`** — serialises one currency's buckets to CSV via `toCsv` and triggers a browser download through `downloadBlob`.

## Relationships

- **`ChartWithTable.vue`** — rendered twice per currency (sales chart, orders chart); receives a `ChartModel` and a `file-name` for its own CSV export.
- **`domain/index.ts`** — barrel re-export providing `bucketLabel`, `isFlat`, `percentChange`, `toCsv`, and the `ChartModel` type used throughout.
- **`domain/chart.ts`** — defines the `ChartModel` type and chart-related helpers consumed by `chartsOf`.
- **`domain/csv.ts`** — supplies `toCsv`, called by `downloadRevenue`.
- **`domain/figures.ts`** — defines `SalesFigures` (the shape of `totals` / `previous` / `figures` per bucket) and `SalesCurrency`.
- **`StatsDashboard.vue`** — parent view; owns the `sales` fetch and passes the result as the `sales` prop.
- **`tests/sections.spec.ts`** — integration/unit tests covering this section's rendering and data flow.

## Notes

- **No computation.** All aggregates (`totals`, `previous`, `buckets[].figures`) arrive pre-computed from the API. The component only formats (`formatCurrency`, `formatPercent`) and labels.
- **Separate chart axes.** Sales (money) and orders (count) are deliberately split into two `ChartModel`s with different `yTitle`s so they don't share a single axis.
- **CSV reuses chart labels.** `downloadRevenue` receives `charts.sales.labels`, guaranteeing the exported period column matches what the screen shows.
- **`<script>` + `<script setup>` pairing.** The plain `<script>` block exists solely to set `name: 'SalesSection'` for devtools and `<KeepAlive>`; all logic lives in `<script setup>`.
- **`vFocusableScroll`** is applied to the revenue `<v-table>` for keyboard-navigable scrolling.
