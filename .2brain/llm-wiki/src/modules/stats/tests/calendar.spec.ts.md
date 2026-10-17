---
source: src/modules/stats/tests/calendar.spec.ts
sha256: 161558f5bdf81b0f4bfd1f83ea1f02f811178a20ee865d50710116ba55e25a57
generated_at: 2026-10-17T01:42:52.132787+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/tests/calendar.spec.ts

## Purpose

Unit-test suite (Vitest) for the calendar utility functions in the stats domain. It pins down the expected behavior of date parsing, day arithmetic, and range counting so that regressions in `calendar.ts` are caught at the boundary of valid/invalid inputs.

## Key elements

- **`describe('isCalendarDay')`** — Verifies the type-guard accepts well-formed ISO dates (including leap-day `2024-02-29`) and rejects `undefined`, empty strings, non-padded dates, impossible dates (`02-30`, `13-01`), and non-date strings.
- **`describe('addCalendarDays')`** — Checks that adding/subtracting days correctly crosses month boundaries, year boundaries, and leap-day transitions.
- **`describe('daysInRange')`** — Confirms inclusive counting (single-day range = 1, 7-day span = 7) and that a reversed range yields a value ≤ 0.
- **`describe('toCalendarDay')** — Asserts that a `Date` object is converted to a zero-padded `YYYY-MM-DD` string.

## Relationships

- **`src/modules/stats/domain/calendar.ts`** — The sole subject under test. This file imports and exercises `isCalendarDay`, `addCalendarDays`, `daysInRange`, and `toCalendarDay` from that module. No other files are referenced.

## Notes

- Imports use an explicit `.ts` extension (`'../domain/calendar.ts'`), matching the project's ESM/Node-18-style resolution rather than extensionless paths.
- The `daysInRange` reversed-range assertion uses `toBeLessThanOrEqual(0)` (not `toBe(-6)`), deliberately leaving the exact negative value unconstrained.
- All date literals are hardcoded ISO strings; no `new Date()` is used in assertions except the single `toCalendarDay` case (which relies on local-timezone construction `new Date(2026, 0, 5)`).
