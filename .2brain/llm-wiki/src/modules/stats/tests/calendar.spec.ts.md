---
source: src/modules/stats/tests/calendar.spec.ts
sha256: 161558f5bdf81b0f4bfd1f83ea1f02f811178a20ee865d50710116ba55e25a57
signature: 161558f5bdf81b0f4bfd1f83ea1f02f811178a20ee865d50710116ba55e25a57
generated_at: 2026-11-10T05:50:07.812853+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/tests/calendar.spec.ts

## Purpose

Unit-test suite (Vitest) that pins the public contract of the stats **calendar** domain module — date-string validation, day arithmetic, range counting, and `Date`-to-ISO conversion — so refactors in `calendar.ts` are caught immediately.

## Key elements

- **`describe('isCalendarDay')`** — Verifies `isCalendarDay` accepts well-formed ISO dates (including leap day `2024-02-29`) and rejects undefined, empty strings, non-zero-padded dates (`2026-2-3`), impossible dates (`2026-02-30`, `2025-02-29`), free-text (`tomorrow`), and out-of-range month (`2026-13-01`).
- **`describe('addCalendarDays')`** — Verifies `addCalendarDays` handles month-end and year-end rollover in both directions, and that adding two days from `2024-02-28` lands on `2024-03-01` (skipping the leap day correctly).
- **`describe('daysInRange')`** — Verifies the range is **inclusive** on both ends (single-day range → 1, week → 7) and that a reversed range (end < start) yields ≤ 0.
- **`describe('toCalendarDay')`** — Verifies `toCalendarDay` zero-pads month and day when converting a JS `Date` to an ISO string.

## Relationships

- **`src/modules/stats/domain/calendar.ts`** — The sole dependency. This spec imports and exercises its four exports: `isCalendarDay`, `addCalendarDays`, `daysInRange`, `toCalendarDay`. No other files are referenced.

## Notes

- The reversed-range assertion for `daysInRange` intentionally uses `toBeLessThanOrEqual(0)` rather than an exact value, leaving the implementation free to return `0`, `-1`, or another non-positive sentinel.
- Test cases hard-code specific years (2024 = leap, 2025/2026 = non-leap) to exercise Feb-29 edge paths; they are not data-driven over arbitrary years.
- The import path uses an explicit `.ts` extension, consistent with the project's ESM/TS-node resolution style.
