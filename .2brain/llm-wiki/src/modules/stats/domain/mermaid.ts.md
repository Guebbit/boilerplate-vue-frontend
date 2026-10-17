---
source: src/modules/stats/domain/mermaid.ts
sha256: 65b2b43a92f2752dad5dca210d2077123b37680258085b386b62ef1f4e704c3b
generated_at: 2026-10-17T01:41:54.130628+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/domain/mermaid.ts

## Purpose

Converts a `ChartModel` into Mermaid diagram source text (`xychart-beta` for bar/line, `pie` for pie). Because Mermaid parses a mini-language and every label is free-form text a shop owner typed, this module sanitises all labels through an allow-list before embedding them in quoted Mermaid directives, providing the first line of defence alongside Mermaid's own `securityLevel: 'strict'`.

## Key elements

- **`safeLabel(text: string): string`** *(exported)* — Replaces any character outside a Unicode letter/digit/space/punctuation allow-list with a space, collapses whitespace runs, trims, and truncates to `MAX_LABEL_LENGTH` (32) chars with a `…` suffix. Guarantees no quote, backslash, `#`, `;`, bracket, `%`, or line-break survives.
- **`plotted(value: number): number`** *(module-private)* — Rounds to at most 2 decimals; returns `0` for `NaN`/`Infinity`.
- **`xyChartSource(chart: ChartModel): string`** *(exported)* — Builds `xychart-beta` source: title, x-axis labels, y-axis title, and one `bar`/`line` directive per series, values already passed through `plotted`.
- **`pieChartSource(chart: ChartModel): string`** *(exported)* — Builds `pie showData` source from the **first series only**; slices with a non-positive value are omitted.
- **`MAX_LABEL_LENGTH`** — Constant (32) capping label length; Mermaid does not wrap axis text.

## Relationships

- **Imports** `ChartModel` (type-only) from `./chart.ts` — the single data shape consumed by both source generators.
- **Re-exported** through `domain/index.ts`, making `safeLabel`, `xyChartSource`, and `pieChartSource` available to the wider stats module.
- **Consumed by** `MermaidChart.vue` (and `ChartWithTable.vue`) which call the source generators and feed the result to the Mermaid renderer.
- **Covered by** `tests/domain.spec.ts` for unit-level assertions on label sanitisation and source output.

## Notes

- `pieChartSource` silently discards negative *and* zero values; the caller should not expect a pie slice for those entries.
- Only `chart.series[0]` is read for pies; additional series in the model are ignored.
- The sanitisation regex uses Unicode property escapes (`\p{L}`, `\p{N}`) with the `u` flag, so CJK and other non-Latin labels survive but still pass through the allow-list.
- `plotted` is intentionally not exported; it exists solely to keep Mermaid's numeric values human-readable.
