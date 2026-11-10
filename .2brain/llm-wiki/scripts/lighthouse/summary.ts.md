---
source: scripts/lighthouse/summary.ts
sha256: d0b8bef3f22ad855ba6b9b7a477298c04a00b83c5b64caa2197433f40ab5ea7e
signature: cba3233090a6a331e29606171e50221568f6f5c24b80726d7b05095f980d193b
generated_at: 2026-11-10T02:44:13.110275+00:00
model: ollama:qwen3.8:27b
---

# scripts/lighthouse/summary.ts

## Purpose

Pure formatter that turns an `Evaluation` (plus an optional committed baseline) into a single Markdown string — a per-case table, a green/red verdict line, and failure/warning lists. Designed to be dropped into a terminal, a report folder, or a nightly step summary without any I/O.

## Key elements

- **`TIMING`** — `readonly ['lcp', 'fcp', 'tbt', 'si']`; defines which metrics appear as columns and in what order.
- **`row(id, now, baseline)`** — (module-private) Builds one Markdown table row. If a baseline exists for the case, each timing cell shows `median / budget` (budget = baseline × `TIMING_HEADROOM`); otherwise only the median is shown. CLS and performance score are always included.
- **`renderSummary(evaluation, baseline)`** — The sole export. Joins the heading, verdict line, table header/rows, and optional `### Failures` / `### Warnings` sections into one `\n`-joined string.

## Relationships

- **`./baseline`** — Imports the `CaseMetrics` and `LighthouseBaseline` types; the baseline values become the "budget" column in the table.
- **`./evaluate`** — Imports the `Evaluation` type (the input shape) and the `TIMING_HEADROOM` constant used to compute budget cells.
- **`scripts/lighthouse/run.ts`** — Calls `renderSummary` to produce the human-readable output for the nightly run and to write the Markdown report file.

## Notes

- Output is Markdown (not HTML), so it renders correctly in GitHub step summaries and plain-text terminals alike.
- Timing metrics are *advisory only* (the verdict line says "it only warns"); hard failures come from the `evaluation.failures` array, which is rendered as a separate bullet list.
- The verdict line is binary: "green" when `failures.length === 0`, "red" otherwise — warnings do not flip the color.
- `TIMING_HEADROOM` is imported from `evaluate.ts`; the numeric value is interpolated into the table legend string, so changing it there automatically updates the printed description.
