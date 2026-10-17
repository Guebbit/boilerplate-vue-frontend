---
source: src/modules/stats/domain/calendar.ts
sha256: 24f43c31c91786759a18fe838130376c422073b4c0bd70640340410654dbc151
generated_at: 2026-10-17T01:41:06.544817+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/domain/calendar.ts

## Purpose

Pure utility functions for calendar-day arithmetic using the browser's local timezone. Dates are represented as plain `YYYY-MM-DD` strings (the shape the stats API's `from`/`to` params and `<input type="date">` use). All logic is client-side; when the browser's zone differs from the server's, the server's interpretation wins (surfaced as `timeZone` in the stats response).

## Key elements

- **`isCalendarDay(value)`** – Type-guard: returns `true` only if the string matches `YYYY-MM-DD` *and* the date actually exists (rejects e.g. `2026-02-30`). Accepts `undefined` safely.
- **`toCalendarDay(date)`** – Formats a `Date` as a local-zone `YYYY-MM-DD` string.
- **`addCalendarDays(day, days)`** – Shifts a day string forward/back by whole days. Uses `setDate` so it rolls across month/year boundaries and stays correct through DST transitions (unlike raw ms arithmetic).
- **`daysInRange(from, to)`** – Inclusive day count between two day strings (`from === to` → 1; `to` before `from` → ≤ 0). Uses `Math.round` to absorb the 23 h / 25 h drift a DST shift introduces.
- **`midnightOf(day)`** *(internal)* – Parses a day string to a local-midnight `Date`; used by the two arithmetic functions above.
- **`MILLISECONDS_PER_DAY`**, **`DAY_PATTERN`** *(internal)* – Constant and regex backing the above.

## Relationships

- **`src/modules/stats/domain/index.ts`** – Re-exports this module's public API so consumers can import from the domain barrel.
- **`src/modules/stats/domain/period.ts`** – Consumes `isCalendarDay`, `addCalendarDays`, and `daysInRange` to build and validate date-range periods for stats queries.
- **`src/modules/stats/tests/calendar.spec.ts`** – Unit tests exercising every exported function, including DST and month/year edge cases.

## Notes

- All functions assume the **browser's** timezone. They never call `Date` UTC accessors; `getFullYear/getMonth/getDate` (local) are used throughout.
- `addCalendarDays` deliberately avoids `date + n * 86_400_000` because a DST transition makes a "day" 23 or 25 hours; `setDate` sidesteps this.
- `daysInRange` returns **1** for the same day (inclusive), not 0. Callers comparing "did the range advance?" should check `> 1`.
- The module is intentionally side-effect-free and framework-free — no React, no API calls, no external date libraries.
