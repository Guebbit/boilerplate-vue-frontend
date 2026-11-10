---
source: src/modules/stats/domain/chart.ts
sha256: 523e1f45350c3d296d7223c50ac26690cd1d0fe5c0644da60c810a4e72895067
signature: a6f209ff4ac231a4dee5ed17044c0de3553bab0b24d9f3b59a9842b76c15604a
generated_at: 2026-11-10T05:47:51.994535+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/domain/chart.ts

## Purpose

Defines the single canonical data shape (`ChartModel`) from which every stats chart, its "show as table" view, and its CSV export are rendered. By funneling all three representations through one structure, the picture, the table, and the file cannot disagree.

## Key elements

- **`ChartSeries`** (interface) — one drawn series: `name` (legend / column title), `values` (one number per label, in order), `kind` (`'bar' | 'line'`).
- **`ChartModel`** (interface) — the full chart payload: `title`, `labels` (x-axis or pie slices), `series` (array of `ChartSeries`; a pie reads only the first), optional `yTitle` (xy charts only).
- **`chartTable(chart, labelTitle)`** (function) — projects a `ChartModel` into `{ header: string[]; rows: CsvCell[][] }`, with the label as the first column and one column per series.

## Relationships

- **`src/modules/stats/domain/csv.ts`** — imports the `CsvCell` type used as the cell type in `chartTable`'s return value.
- **`src/modules/stats/domain/index.ts`** — barrel module that re-exports this file's types and function to consumers.
- **`src/modules/stats/components/ChartWithTable.vue`** — consumes `ChartModel` for drawing and calls `chartTable` to render the tabular view.
- **`src/modules/stats/tests/domain.spec.ts`** / **`src/modules/stats/tests/chart-with-table.spec.ts`** — unit tests covering the types and the `chartTable` projection.

## Notes

- A pie chart is expressed by a `ChartModel` whose `series` array is effectively length 1; the second and later entries are ignored.
- `ChartSeries.kind` (`'bar' | 'line'`) is meaningful only for xy charts; it has no effect on pie rendering.
- `values` length is expected to equal `labels` length — `chartTable` indexes both with the same `index` and will silently produce `undefined` cells if they diverge.
