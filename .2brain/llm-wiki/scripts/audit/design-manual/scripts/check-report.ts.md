---
source: scripts/audit/design-manual/scripts/check-report.ts
sha256: 679829bc03e8c9202e471abf4a14e02bbd1db68933d991befc805f7280b70234
signature: 8f0b18f807b1d62140a243cf817186cf79f76db35339ca685eb40efeac5cdf04
generated_at: 2026-11-10T02:21:48.094887+00:00
model: ollama:qwen3.8:27b
---

# scripts/audit/design-manual/scripts/check-report.ts

## Purpose

Pure citation validator for design-review reports. Given a markdown findings table and a `CitationSources` oracle, it verifies every row's tile exists (in manifest and on disk), every `file:line` citation is in-bounds, every item matches the D1–D16 checklist or the `+ name — anchor` reviewer-addition format, severity is S1–S3, and the fix cell is non-empty. It is deliberately side-effect-free so the CLI and tests can each supply their own sources.

## Key elements

- **`checkReport(markdown, sources): CheckResult`** — The single public entry point. Scans a markdown document line-by-line, identifies the findings table (any table whose header contains both `tile` and `severity`), and returns `{ checked, failures }`.
- **`CitationSources`** (exported interface) — The oracle contract: `manifestTiles` (set of valid tile paths), `fileExists(file)`, and `lineCount(file)`. The CLI backs it with real filesystem/manifest; tests back it with fixtures.
- **`CitationFailure`** (exported interface) — One failed check: `row` id, `column` name, and a human-readable `reason` sentence.
- **`CheckResult`** (exported interface) — `{ checked: number, failures: CitationFailure[] }`.
- **`cellsOf`, `unquote`, `columnsOf`, `isFindingsTable`** — Internal helpers for parsing markdown table rows into trimmed cells, detecting the findings-table shape from headers, and stripping backtick quoting.
- **`sourceProblemOf`** — Validates a `file:line` or `file:from-to` citation against `sources.lineCount`; returns a reason string or `undefined`.
- **`checkRow`** — Runs all five column checks (tile, source, item, severity, fix) for a single row.
- **Regexes:** `CHECKLIST_ITEM` (D1–D16), `ADDED_ITEM` (`+ name — anchor`), `SOURCE_CITATION` (path + line/range), `UNESCAPED_PIPE` (table cell splitting).

## Relationships

- **`scripts/audit/design-manual/scripts/check.ts`** — The CLI wrapper. It constructs a concrete `CitationSources` (reading the manifest and the disk), calls `checkReport`, and renders the result to stdout/exit-code. This file is the pure logic; `check.ts` is I/O.
- **`tests/unit/scripts/audit/check-report.spec.ts`** — Unit tests that supply fixture-based `CitationSources` and assert on the `CheckResult` returned by `checkReport` for various markdown inputs.

## Notes

- A report with **no** table at all passes with `checked: 0`; a report with tables but **none** shaped as a findings table (missing `tile` or `severity` header) fails with a single `column: 'table'` entry. This prevents a mangled header from silently passing.
- Table detection is header-driven, not position-driven: column order can vary, and extra columns (e.g. `id`) are tolerated.
- Escaped pipes (`\|`) inside cells are preserved; unescaped pipes are the cell delimiter.
- The `row` label in a failure is the value of the `id` cell if present, otherwise `row <n>` (1-based within the table).
- The module is marked `@module` — no named default export, no side effects on import.
