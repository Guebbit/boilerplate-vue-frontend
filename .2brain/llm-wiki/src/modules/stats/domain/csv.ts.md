---
source: src/modules/stats/domain/csv.ts
sha256: c2de5a3af7eba3ecfc203334f917182de03d32fcaf8f2a516a11716f6fadc2dd
generated_at: 2026-10-17T01:41:28.336921+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/domain/csv.ts

## Purpose

Pure client-side CSV serialization for the stats module's on-screen tables. It exists so components can hand users a downloadable file without pulling in a library, and so every cell passes through a CSV-injection guard (OWASP) before it reaches Excel or another spreadsheet.

## Key elements

- **`CsvCell`** (type) — Union `string | number | undefined`; the allowed input for any single cell.
- **`FORMULA_START`** (const, module-private) — Regex `/^[\t\r+=@-]/` that flags text a spreadsheet would interpret as a formula.
- **`escapeCsvCell`** (exported) — Normalizes one cell: `undefined` → `""`, non-finite numbers → `""`, formula-like text gets a `'` prefix, and any value containing a comma, double-quote, or line break is wrapped in quotes with internal quotes doubled.
- **`toCsv`** (exported) — Takes a `string[]` header and `CsvCell[][]` rows, escapes every cell via `escapeCsvCell`, joins with commas and CRLF (`\r\n`) per RFC 4180, and returns the complete CSV text.

## Relationships

- **`src/modules/stats/domain/index.ts`** — Barrel file that re-exports the public API of this module (`CsvCell`, `escapeCsvCell`, `toCsv`) so consumers import from the domain root.
- **`src/modules/stats/components/ChartWithTable.vue`** — Consumes `toCsv` (and the `CsvCell` type) to serialize its table rows into a downloadable file.
- **`src/modules/stats/components/SalesSection.vue`** — Same consumer pattern for the sales table's export.
- **`src/modules/stats/tests/domain.spec.ts`** — Unit-tests `escapeCsvCell` and `toCsv` edge cases (formula injection, quoting, non-finite numbers).
- **`src/modules/stats/domain/chart.ts`** — Sibling domain module; no direct import relationship visible in this file.

## Notes

- Output line endings are **CRLF**, not LF. Tests and any manual assertions should expect `\r\n`.
- A `Number` that is `NaN` or `±Infinity` is silently rendered as an empty string rather than a textual representation—intentional, to avoid polluting the spreadsheet with `NaN`/`Infinity` tokens.
- The formula-injection prefix is a single ASCII apostrophe (`'`), not a backtick or any locale-specific character.
- Quoting in `escapeCsvCell` is decided **after** the formula prefix is applied, so a value like `",=SUM(A1)"` becomes `""','=SUM(A1)""` (quote → prefix → outer quotes).
