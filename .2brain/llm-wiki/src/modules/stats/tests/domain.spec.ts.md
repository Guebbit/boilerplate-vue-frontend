---
source: src/modules/stats/tests/domain.spec.ts
sha256: bff1a24ed2b8d1d2a2848f6a49a1f5a0ad226f270b9a92d6c747dfcb8ef37842
generated_at: 2026-10-17T01:43:19.381351+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/tests/domain.spec.ts

## Purpose

Vitest test suite covering the pure, DOM-free logic of the stats domain: period validation, bucket arithmetic, percentage-change helpers, CSV escaping, and Mermaid chart-source generation. It exists to pin down edge cases (invalid dates, hostile labels, formula injection, timezone-shifted bucket labels) that the domain functions must handle correctly.

## Key elements

- **`TODAY`** — fixed `Date(2026, 9, 12)` used as a deterministic "now" for all preset-period assertions.
- **`CHART: ChartModel`** — shared two-series fixture (one bar, one line; three labels including a hostile `"x"]; pie"`) consumed by `xyChartSource`, `pieChartSource`, and `chartTable` tests.
- **`describe('periodProblem')`** — validates date existence, range direction, the two-year ceiling, and the `MAX_BUCKETS` (400) cap.
- **`describe('bucketCount')` / `describe('autoInterval')`** — checks day/week/month bucket math and the automatic interval chosen for a given range.
- **`describe('presetPeriod')` / `describe('periodFromQuery')`** — verifies preset window resolution and URL-query fallback (missing, malformed, reversed, unknown interval).
- **`describe('percentChange')` / `describe('isFlat')`** — confirms fraction-of-previous semantics, `undefined` for zero base, negative-base handling, and the 0.05 % flat threshold.
- **`describe('escapeCsvCell')` / `describe('toCsv')`** — formula-injection neutralisation (`=`, `+`, `-`, `@`, tabs), RFC-style quoting, `CRLF` row separator, and empty output for `undefined`/`NaN`.
- **`describe('safeLabel')`** — ensures Mermaid-breaking characters (`"`, `#`, `%`, `;`, `<`, `>`, brackets, backslash, newlines) are stripped, non-Latin scripts are kept, and labels exceeding 31 chars are truncated with `…`.
- **`describe('xyChartSource')`** — asserts axis declarations, per-series statements in order, NaN → `0`, and that hostile labels cannot inject extra lines.
- **`describe('pieChartSource')`** — reads the first series only and drops non-positive slices.
- **`describe('chartTable')`** — tabular view: label column + one column per series, preserving NaN.
- **`describe('bucketLabel')`** — timezone-aware bucket naming (e.g. `Europe/Rome` vs `UTC`) and month-year format.

## Relationships

- **`src/modules/stats/domain/index.ts`** — sole import target; re-exports every function and the `ChartModel` type tested here.
- **`src/modules/stats/domain/period.ts`** — source of `periodProblem`, `periodFromQuery`, `presetPeriod`, `autoInterval`, `bucketCount`, `MAX_BUCKETS`.
- **`src/modules/stats/domain/series.ts`** — source of `bucketLabel` (timezone/locale formatting).
- **`src/modules/stats/domain/figures.ts`** — source of `percentChange`, `isFlat`.
- **`src/modules/stats/domain/csv.ts`** — source of `escapeCsvCell`, `toCsv`.
- **`src/modules/stats/domain/chart.ts`** — source of `xyChartSource`, `pieChartSource`, `chartTable`.
- **`src/modules/stats/domain/mermaid.ts`** — source of `safeLabel`.

## Notes

- All tests are synchronous and side-effect free; there is no mocking, async, or DOM.
- `safeLabel` truncates to **32 characters** total (31 visible + one `…`), not 31.
- `escapeCsvCell` prepends a leading `'` (and wraps in double-quotes) for formula-like strings, which is the injection guard Excel/Sheets recognise — the test only checks the `^"?'"` shape, not the exact wrapper.
- `toCsv` uses `CRLF` line endings, not `\n`; any downstream parser must expect that.
- The `CHART` fixture intentionally includes a `NaN` value to confirm both chart-source (coerced to `0`) and table (preserved as `NaN`) behaviours diverge by design.
