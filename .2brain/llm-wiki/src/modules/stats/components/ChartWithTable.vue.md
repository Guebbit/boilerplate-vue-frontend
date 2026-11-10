---
source: src/modules/stats/components/ChartWithTable.vue
sha256: 424c650c4c25b6adc2f554c9c51845028c79e510944ed2ebef1152af7601a497
signature: e0c5943bd02e4b29225f2a5e2309faf35758bdb6a9bb5f31e5ea6244ef9b4f26
generated_at: 2026-11-10T05:45:54.868839+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/components/ChartWithTable.vue

## Purpose

Reusable chart-block component that renders a single `ChartModel` in one of three interchangeable forms — a Mermaid diagram (xy or pie), an accessible HTML table, or a downloadable CSV file — all derived from the same data. It exists so that every stats view gets a consistent title bar, chart/table toggle, and CSV export without repeating the logic.

## Key elements

- **Props** (`chart: ChartModel`, `kind: 'xy' | 'pie'`, `labelTitle: string`, `fileName: string`) — describe what to draw and how to name the export.
- **`asTable`** (`ref<boolean>`) — toggles between the Mermaid picture and the `<v-table>` view.
- **`definition`** (computed) — delegates to `pieChartSource` or `xyChartSource` to produce the Mermaid source string passed to `MermaidChart`.
- **`table`** (computed) — calls `chartTable(chart, labelTitle)` to get `{ header, rows }` shared by both the visible table and the CSV.
- **`hasData`** (computed) — `chart.labels.length > 0`; gates the toggle/CSV buttons and the empty-state paragraph.
- **`downloadCsv`** — builds a CSV string via `toCsv` and triggers a browser download with `downloadBlob` from `@guebbit/js-toolkit`; no server route involved.
- **Template** — a `<section>` with title, toggle button (icon swaps between `ChartColumn`/`Table2`), CSV button, an empty-state `<p>`, a `<v-table>` (with `v-focusable-scroll`), or `<MermaidChart>`.

## Relationships

- **`src/modules/stats/components/MermaidChart.vue`** — child component rendered when `asTable` is `false`; receives the computed `definition` string and the chart title as `label`.
- **`src/modules/stats/domain/index.ts`** — barrel import target (`../domain`) that re-exports `chartTable`, `pieChartSource`, `xyChartSource`, `toCsv`, and the `ChartModel` type used by this component.
- **`src/modules/stats/domain/chart.ts`** — provides `chartTable` and the `ChartModel` type.
- **`src/modules/stats/domain/mermaid.ts`** — provides `pieChartSource` and `xyChartSource` for generating Mermaid diagram source.
- **`src/modules/stats/domain/csv.ts`** — provides `toCsv` for serializing the table into a CSV string.
- **`src/modules/stats/views/StatsProductSales.vue`** — parent view that instantiates this component for each chart block in the stats page.
- **`src/modules/stats/components/OperationsSection.vue`** / **`src/modules/stats/components/ProductsSection.vue`** / **`src/modules/stats/components/SalesSection.vue`** — sibling section components in the same stats module that compose or sit alongside instances of `ChartWithTable`.
- **`src/modules/stats/tests/chart-with-table.spec.ts`** — unit/integration test covering this component's rendering and interactions.

## Notes

- Uses a dual-script pattern (`<script>` + `<script setup>`) solely to set a stable `name: 'ChartWithTable'` for devtools and `<KeepAlive>`; the setup block itself cannot declare a component name.
- The CSV is generated entirely client-side from the already-computed table rows; no API call is made.
- Accessibility: the table is the intended non-visual alternative to the chart. The `<v-table>` carries a `sr-only` `<caption>`, `scope="row"` on first-column cells, and the `v-focusable-scroll` directive for keyboard users.
- When `hasData` is `false`, both the toggle and CSV buttons are removed from the DOM (not just hidden), and a localized "no data" message is shown instead.
