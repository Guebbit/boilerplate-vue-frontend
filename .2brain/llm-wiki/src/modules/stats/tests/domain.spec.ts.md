---
source: src/modules/stats/tests/domain.spec.ts
sha256: 4d66975c7622e8ba9277ee009a8f1751fa0937718893a9dbd8d3fb88ca935e64
signature: 380d247a314a9d134a1742fe29d1d2b2cd6570cbc92c50f112e8e7c3772ec0fd
generated_at: 2026-11-10T05:50:45.855757+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/tests/domain.spec.ts

## Purpose

Vitest test suite covering every exported pure function in the stats domain layer. It locks down the validation rules the API enforces (date range limits, bucket ceilings), the arithmetic helpers for change figures, the CSV-escaping contract, and the Mermaid label-sanitisation guarantees. Exists so the domain module can be refactored freely while its externally-visible invariants stay pinned.

## Key elements

- **`LIMITS`** — module-level constant (`{ maxRangeDays: 731, maxBuckets: 400 }`) mirroring the server's stated ceilings; passed to `periodProblem` to exercise the "too-long" and "too-many-buckets" paths.
- **`TODAY`** — a frozen `Date(2026, 9, 12)` so every preset-period assertion is deterministic without mocking the clock.
- **`CHART`** (`ChartModel`) — a two-series fixture whose labels and title deliberately contain quotes, `]`, `;`, and other Mermaid-breaking characters; reused by `xyChartSource`, `pieChartSource`, and `chartTable` tests.
- **`describe('periodProblem')`** — validates shape errors (`invalid`, `reversed`), ceiling enforcement (`too-long`, `too-many-buckets`), and that ceilings are only applied when the `LIMITS` argument is supplied.
- **`describe('bucketCount')`** — asserts day/week/month bucket arithmetic including partial weeks at boundaries and multi-month spans.
- **`describe('autoInterval')`** — `it.each` table mapping date ranges to the expected interval (`day`, `week`, `month`).
- **`describe('presetPeriod')`** / **`describe('periodFromQuery')`** — pin the "ends today, counts today" convention, the `this-year` anchor, and the fallback-to-`last-30` behaviour for missing/malformed/impossible query params.
- **`describe('percentChange')`** / **`describe('isFlat')`** — verify fractional-change math (including negative-base edge case) and the ±0.0005 flat threshold.
- **`describe('escapeCsvCell')`** / **`describe('toCsv')`** — confirm formula-start neutralisation (prefix `'`), standard CSV quoting, CRLF row joins, and empty-string for `undefined`/`NaN`.
- **`describe('safeLabel')`** — asserts CJK retention, removal of every character that could close a Mermaid quote or open a directive, and 32-char truncation with `…`.
- **`describe('xyChartSource')`** / **`describe('pieChartSource')`** / **`describe('chartTable')`** — check output shape (axis declaration count, line order, slice filtering for non-positive values, header/row layout).

## Relationships

- **`src/modules/stats/domain/index.ts`** — sole import target; every function under test is re-exported through this barrel. The test never imports a leaf file directly.
- **`src/modules/stats/domain/period.ts`** — source of `periodProblem`, `bucketCount`, `autoInterval`, `presetPeriod`, `periodFromQuery`; the first four `describe` blocks exercise this file's logic.
- **`src/modules/stats/domain/figures.ts`** — source of `percentChange` and `isFlat`; covered by the two short `describe` blocks in the middle.
- **`src/modules/stats/domain/csv.ts`** — source of `escapeCsvCell` and `toCsv`; the formula-start table and CRLF assertion are the primary guard on this module.
- **`src/modules/stats/domain/mermaid.ts`** — source of `safeLabel`, `xyChartSource`, `pieChartSource`; the hostile `CHART` fixture and the "lets no label add a line of its own" assertion exist specifically to pin this module's sanitisation.
- **`src/modules/stats/domain/chart.ts`** — provides the `ChartModel` type used in the fixture and the `chartTable` function under test.

## Notes

- All tests are synchronous and DOM-free; no `vi.useFakeTimers` or `vi.mock` is needed because `TODAY` is passed explicitly wherever a date is required.
- `periodProblem` has two call signatures: with and without the `LIMITS` second argument. Tests for the no-limits form live in the first three `it` blocks; ceiling tests are clearly separated in the last two.
- The `escapeCsvCell` formula-start test uses `it.each` over raw strings (`=`, `+`, `-`, `@`, `\t`, `\r`); the expectation regex `/^"?'/` tolerates an optional leading quote before the mandatory single-quote prefix.
- `safeLabel` truncation test hard-codes the 32-char output length (31 chars + `…`); if the limit constant in the source changes, only this assertion breaks.
- The module-level doc comment declares the contract: "Pure functions, no DOM." Any test that would require a DOM or async I/O would violate the module's stated scope.
