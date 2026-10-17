---
source: src/modules/stats/components/ChartWithTable.vue
sha256: 424c650c4c25b6adc2f554c9c51845028c79e510944ed2ebef1152af7601a497
generated_at: 2026-10-17T01:39:52.665596+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/components/ChartWithTable.vue

## Purpose

Renders one chart block: a Mermaid-drawn chart, a toggle to an accessible HTML table, and a CSV download button. All three views are derived from the same `ChartModel` prop so the picture, the table, and the export never disagree. It is the leaf building block that the stats sections compose.

## Key elements

- **Props** — `chart: ChartModel`, `kind: 'xy' | 'pie'`, `labelTitle: string`, `fileName: string`. `kind` selects the Mermaid generator; `labelTitle` names the first table column; `fileName` is the base name for the CSV download.
- **`asTable` (ref)** — toggles between the Mermaid chart and the `<v-table>` rendering.
- **`definition` (computed)** — calls `pieChartSource` or `xyChartSource` (from `../domain`) to produce the Mermaid source string.
- **`table` (computed)** — calls `chartTable(chart, labelTitle)` to produce `{ header: string[], rows: string[][] }`.
- **`hasData` (computed)** — `chart.labels.length > 0`; gates the buttons, the empty-state paragraph, and which view renders.
- **`downloadCsv()`** — builds CSV text via `toCsv` and triggers a browser download with `downloadBlob` from `@guebbit/js-toolkit`. Entirely client-side; no server route.
- **Template** — `<section>` with `aria-label` and `data-test="chart-block"`; a toolbar row (title, toggle button, CSV button); then either an empty-state `<p>`, a `<v-table>` (with `v-focusable-scroll`), or `<MermaidChart>`.

## Relationships

- **Imports `MermaidChart.vue`** — the sole visual renderer used when `asTable` is `false`; receives the computed `definition` string and `chart.title` as label.
- **Imports from `../domain` (`domain/index.ts`)** — `chartTable`, `pieChartSource`, `xyChartSource` (re-exported from `domain/chart.ts` / `domain/mermaid.ts`) and `toCsv` (from `domain/csv.ts`), plus the `ChartModel` type.
- **Tested by `tests/chart-with-table.spec.ts`** — unit/integration tests for the toggle, empty state, and CSV output.
- **Consumed by the section components** (`OperationsSection.vue`, `ProductsSection.vue`, `SalesSection.vue`) and ultimately by the `ProductSales.vue` view, which passes in the `ChartModel` data and layout props.

## Notes

- The component declares its name via a separate `<script lang="ts">` block (`export default { name: 'ChartWithTable' }`) because `<script setup>` cannot set a component name. Required for Vue DevTools and `<KeepAlive>` cache-key matching.
- CSV export is intentionally client-side: the data is an aggregate with no personal information, so no server endpoint is needed.
- The table uses `v-focusable-scroll` (a project directive) for keyboard navigation and `scope="row"` on the first `<th>` of each row for screen-reader semantics.
- The toggle and CSV buttons are hidden entirely when `hasData` is false — the component shows only a localized empty-state message in that case.
