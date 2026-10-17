---
source: src/modules/stats/domain/chart.ts
sha256: 523e1f45350c3d296d7223c50ac26690cd1d0fe5c0644da60c810a4e72895067
generated_at: 2026-10-17T01:41:16.570236+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/domain/chart.ts

## Purpose

Defines the single canonical data shape (`ChartModel`) from which every stats chart is drawn, its "show as table" view is rendered, and its CSV export is generated — guaranteeing the picture, the table, and the file can never disagree.

## Key elements

- **`ChartSeries`** (interface) — one drawn series: a `name` (legend / column title), an ordered `values: number[]`, and a `kind` discriminator (`'bar' | 'line'`) used by xy charts.
- **`ChartModel`** (interface) — the full chart payload: `title`, `labels` (x-axis or pie slices), `series: ChartSeries[]`, and an optional `yTitle` (xy charts only).
- **`chartTable(chart, labelTitle)`** (function) — flattens a `ChartModel` into a plain table shape `{ header: string[]; rows: CsvCell[][] }`. The first column is the label; subsequent columns are one per series, indexed positionally.

## Relationships

- **`src/modules/stats/domain/csv.ts`** — imports the `CsvCell` type, which is the element type of `chartTable`'s row cells, tying the table/CSV shape to this module.
- **`src/modules/stats/domain/index.ts`** — barrel file that re-exports this module's types and functions for the rest of the stats domain.
- **`src/modules/stats/components/ChartWithTable.vue`** — consumes `ChartModel` and `chartTable` to render both the chart and its tabular view side by side.
- **`src/modules/stats/components/OperationsSection.vue`, `ProductsSection.vue`, `SalesSection.vue`, `views/ProductSales.vue`** — upstream producers that build a `ChartModel` object to hand to the chart/table components.
- **`src/modules/stats/tests/chart-with-table.spec.ts`, `src/modules/stats/tests/domain.spec.ts`** — exercise the table conversion logic and the overall domain contracts.

## Notes

- `chartTable` is purely positional: it pairs `labels[i]` with `series[k].values[i]`. Callers must keep `labels.length === values.length` for every series; there is no validation here.
- Pie charts reuse the same `ChartModel` shape but only read `series[0]`; extra series are ignored by the pie renderer, not by this file.
- The `CsvCell` type (not shown here) is the shared atomic cell type, so `chartTable`'s output is directly feedable into the CSV writer without further mapping.
