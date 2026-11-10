---
source: tests/unit/scripts/audit/check-report.spec.ts
sha256: 180ce89c788701e1d3724f99e9f2d07a8502177bfade3141a463134e5cd8802b
signature: 0245c539482bdafe48a1e7dc762516df77b3e137c635f2edaf3659a5ce91f403
generated_at: 2026-11-10T08:12:11.125513+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/audit/check-report.spec.ts

## Purpose

Vitest unit tests for `checkReport`, the function that validates a Markdown findings table in an audit report against a set of `CitationSources`. It ensures every cited tile, source line, checklist item, severity, and fix passes (or produces a precise failure record) without trusting the report's own claims.

## Key elements

- **`sources: CitationSources`** – Minimal mock: two tiles in the manifest, a `fileExists` predicate that rejects `gone.png`, and `lineCount` defined only for `src/views/Orders.vue` (returns 120).
- **`HEADER`** – The canonical 9-column table header that `checkReport` expects to identify a findings table.
- **`table(over?)`** – Helper that builds a single valid data row; the `over` parameter lets each test swap one cell (tile, source, item, severity, fix) to trigger a specific failure path.
- **`describe('checkReport', …)`** – 14 `it` blocks covering: valid row, unknown/missing tile, out-of-range line, nonexistent file, line-range bounds, non-`file:line` source, out-of-range item, reviewer-added `+` items (with/without anchor), invalid severity + empty fix, backtick-wrapped paths, non-findings tables ignored, report with no findings table, empty report, and multi-row checking.

## Relationships

- **`scripts/audit/design-manual/scripts/check-report.ts`** – The unit under test. This spec imports `checkReport` (the validator function) and the `CitationSources` type from that module. All assertions target the shape and content of the object `checkReport` returns (`{ checked, failures }`).

## Notes

- The mock `sources` is deliberately tiny; any file not listed in `manifestTiles` or not handled by `fileExists`/`lineCount` will trigger the "not on disk" / "does not exist" paths. Tests that need a specific line count rely on the single hard-coded value (120) for `Orders.vue`.
- Reviewer-added items (prefixed with `+`) are only accepted when they include an anchor phrase (e.g. "NN/g heuristic 1"); a bare `+ Skeleton shape` still fails. This convention is easy to miss when adding new checklist items.
- Backticks around paths (`\`src/…\``) are stripped before validation—tests confirm this, but production code that generates reports should not rely on the validator to tolerate them silently.
- The "no findings table" test uses `row: 'table'` / `column: 'table'` as a sentinel, distinct from per-row failure records; any code consuming `failures` must handle this shape.
