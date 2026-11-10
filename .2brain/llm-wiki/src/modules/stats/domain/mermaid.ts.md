---
source: src/modules/stats/domain/mermaid.ts
sha256: 65b2b43a92f2752dad5dca210d2077123b37680258085b386b62ef1f4e704c3b
signature: ac61e87bcb348532999fabd50087387cb583839c9fda57837a014d51b154f9d6
generated_at: 2026-11-10T05:48:41.179832+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/domain/mermaid.ts

## Purpose

Converts a `ChartModel` (title, axis labels, one or more numeric series) into Mermaid diagram source text (`xychart-beta` or `pie`). It exists because the UI renders charts through Mermaid, and every label is user-typed free text that must be sanitised before being embedded in Mermaid's quote-delimited mini-language.

## Key elements

- **`safeLabel(text: string): string`** (exported) — Strips every character outside a Unicode-letter/digit/whitespace/punctuation allow-list, collapses whitespace, and truncates to 32 chars with a trailing `…`. Guarantees no quote, backslash, `#`, `;`, `%`, or line break survives.
- **`xyChartSource(chart: ChartModel): string`** (exported) — Emits `xychart-beta` source: title, x-axis labels, y-axis title, then one `bar`/`line` declaration per series in order.
- **`pieChartSource(chart: ChartModel): string`** (exported) — Emits a `pie showData` block from the **first series only**; slices with a value ≤ 0 are omitted (Mermaid rejects them).
- **`plotted(value: number): number`** (internal) — Rounds to at most 2 decimal places; returns `0` for a value that is not finite.
- **`MAX_LABEL_LENGTH`** (const, 32) — Truncation ceiling used by `safeLabel`.

## Relationships

- **`src/modules/stats/domain/chart.ts`** — Supplies the `ChartModel` type that every exported function accepts.
- **`src/modules/stats/domain/index.ts`** — Barrel re-export; consumers import `safeLabel`, `xyChartSource`, `pieChartSource` through this path.
- **`src/modules/stats/components/MermaidChart.vue`** — Calls `xyChartSource` / `pieChartSource` and feeds the resulting string into a Mermaid renderer.
- **`src/modules/stats/components/ChartWithTable.vue`** — Combines a Mermaid chart (via the above) with a tabular data view of the same `ChartModel`.
- **`src/modules/stats/tests/domain.spec.ts`** — Unit-tests the domain functions in this file (sanitisation edge cases, source generation).

## Notes

- `safeLabel` is the **first** sanitisation layer; Mermaid itself runs at `securityLevel: 'strict'` as a second layer. Neither alone is sufficient if the other is removed.
- `pieChartSource` silently ignores all series after the first—passing a multi-series `ChartModel` will only plot `series[0]`.
- The allow-list regex uses `\p{L}` / `\p{N}` with the `u` flag, so CJK, Cyrillic, Arabic, etc. all pass through; only structural/special characters are stripped.
- `plotted` is deliberately not exported; it exists only to keep emitted numbers readable in the diagram.
