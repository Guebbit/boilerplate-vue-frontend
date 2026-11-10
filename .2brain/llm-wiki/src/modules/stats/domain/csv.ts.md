---
source: src/modules/stats/domain/csv.ts
sha256: ad132b62ac166a1c2b4117b6a41e2b2e7e563a0d320b1168008c455cb45544db
signature: 156e712f9519e821855c189307b668ab144a0bc267750df098cb58280d20796e
generated_at: 2026-11-10T05:48:01.432375+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/domain/csv.ts

## Purpose

Client-side CSV serialization for the stats tables. Converts in-memory row data into a downloadable CSV string, with built-in OWASP CSV-Injection neutralisation so that user-typed product or category titles cannot inject spreadsheet formulas.

## Key elements

- **`CsvCell`** (type) — A single cell value: `string | number | undefined`.
- **`escapeCsvCell(cell)`** (exported function) — Escapes one cell. Returns empty string for `undefined`/non-finite numbers; passes numeric-formatted amounts (e.g. `"-5.00"`) through untouched; prefixes a leading `'` when the text would be interpreted as a formula (starts with `\t \r + = @ -`); wraps in double-quotes (doubling embedded quotes) when the text contains commas, quotes, or line breaks.
- **`toCsv(header, rows)`** (exported function) — Joins a header row and data rows into a single CSV document using CRLF line separators (RFC 4180), applying `escapeCsvCell` to every cell.
- **`FORMULA_START`** (internal regex) — Detects the leading characters that trigger formula interpretation in spreadsheets.
- **`AMOUNT`** (internal regex) — Identifies plain decimal strings (the API's amount format) so they skip the formula-escape step.

## Relationships

- **`src/modules/stats/domain/index.ts`** — Barrel file; re-exports the public API (`CsvCell`, `escapeCsvCell`, `toCsv`) so consumers can import from the domain entry point.
- **`src/modules/stats/domain/chart.ts`** — Sibling domain module; chart data structures feed into the same table rows that `toCsv` serialises.
- **`src/modules/stats/components/ChartWithTable.vue`** — Consumes `toCsv` (via the domain barrel) to build the downloadable CSV from the rows already rendered on screen.
- **`src/modules/stats/components/SalesSection.vue`** — Same consumer pattern: builds CSV export from its sales table rows.
- **`src/modules/stats/tests/domain.spec.ts`** — Unit-tests the escaping rules and CRLF output of `escapeCsvCell` / `toCsv`.

## Notes

- The `AMOUNT` check runs **before** the formula check. A string like `"=5"` would be escaped, but `"5.00"` is passed through verbatim even though it could theoretically start with a digit. The two concerns (numeric passthrough vs. formula injection) are deliberately ordered so the common amount format is never altered.
- `escapeCsvCell` returns `''` for `NaN`/`Infinity`/`-Infinity` rather than the literal string `"NaN"`, keeping the CSV clean.
- Line separator is hardcoded to `\r\n` per RFC 4180; there is no option to switch to LF.
