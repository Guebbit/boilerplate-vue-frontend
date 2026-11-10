---
source: src/modules/stats/domain/calendar.ts
sha256: 24f43c31c91786759a18fe838130376c422073b4c0bd70640340410654dbc151
signature: f319234a44a5a3edf7e034a713889d4a239e035e82fe4a7f64d69d536c2f6802
generated_at: 2026-11-10T05:47:40.670153+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/domain/calendar.ts

## Purpose

Pure-function module that treats a calendar day as a plain `YYYY-MM-DD` string (the shape of a `<input type="date">` value and the stats API's `from`/`to` params) and provides arithmetic over it. All operations run in the browser's local timezone; the shop's server-side zone is a server concern carried out-of-band via `timeZone` on the response.

## Key elements

- **`isCalendarDay(value)`** – Type-guard: returns `true` only for syntactically valid `YYYY-MM-DD` strings that also name a real calendar date (rejects e.g. `2026-02-30`).
- **`toCalendarDay(date)`** – Formats any `Date` instant as its local calendar-day string.
- **`addCalendarDays(day, days)`** – Shifts a day forward or back by a whole number of days, rolling over month/year boundaries.
- **`daysInRange(from, to)`** – Inclusive day count between two days (`1` for the same day; ≤ 0 if `to` precedes `from`).
- **`midnightOf(day)`** *(internal)* – Parses a `YYYY-MM-DD` string into a `Date` at local 00:00.
- **`MILLISECONDS_PER_DAY`**, **`DAY_PATTERN`** – Module-private constants used by the above.

## Relationships

- **`src/modules/stats/domain/index.ts`** – Barrel file that re-exports the public functions from this module for the rest of the stats domain.
- **`src/modules/stats/domain/period.ts`** – Sibling in the stats domain; depends on this module's calendar helpers for date-range operations.
- **`src/modules/stats/tests/calendar.spec.ts`** – Unit tests covering the exported functions.

## Notes

- All arithmetic intentionally avoids raw millisecond addition; `setDate` is used instead so that 23-hour or 25-hour DST days are handled correctly. `daysInRange` wraps the result in `Math.round` for the same reason.
- `midnightOf` is **not** exported; importers should use the public helpers only.
- The module assumes the browser's timezone. If the browser zone differs from the server's shop zone, the server's day boundary is authoritative (surfaced as `timeZone` on the API response).
