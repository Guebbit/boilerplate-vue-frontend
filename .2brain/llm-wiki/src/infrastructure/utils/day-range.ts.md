---
source: src/infrastructure/utils/day-range.ts
sha256: 4d9bce43a6a51a9843676e3c25a6f059dc716f82ec0c11f2058f9c46038c85ee
signature: 65f564c64e59cff71e08185dd0fe54bba3ab18d4b17665ff4fe8338579dad828
generated_at: 2026-11-10T03:10:59.184033+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/day-range.ts

## Purpose

Converts a calendar-day string (`YYYY-MM-DD`) into the first or last UTC instant of that day, providing the inclusive lower/upper bounds needed by the staff-list `…From` / `…To` filters (orders, payments). Pure, dependency-free utility.

## Key elements

- **`DAY_PATTERN`** (private) — regex that validates a `YYYY-MM-DD` string before parsing.
- **`atTime`** (private) — parses a day string, constructs a local `Date` at the supplied time-of-day, and returns `undefined` for malformed or impossible dates (e.g. `2026-02-30`). Guards against `Date`'s silent month-rollover by re-checking month and day.
- **`startOfDayInstant(day)`** (export) — returns the ISO 8601 UTC string for 00:00:00.000 of the given day, or `undefined`.
- **`endOfDayInstant(day)`** (export) — returns the ISO 8601 UTC string for 23:59:59.999 of the given day, or `undefined`.

Both exports accept `string | undefined` (an empty/blank input yields `undefined`) and produce an *instant* rather than a date, because the downstream API filters compare instants inclusive at both ends.

## Relationships

No graph neighbors — this module is a leaf utility with no imports and no recorded dependents in the dependency graph.

## Notes

- "Day" means the browser's local timezone (the viewer's). The module doc notes that the shop's days and the viewer's days differ only for a viewer far from the shop; the stats pages indicate which zone applies.
- `atTime` intentionally rejects impossible calendar days by re-reading the rolled-back month/day from the `Date` object, since `new Date(2026, 1, 30)` silently becomes March 2.
- The returned strings are UTC ISO 8601 (`.toISOString()`), while the time components (00:00 / 23:59:59.999) are interpreted in the viewer's local zone — the resulting instant shifts with the viewer's offset.
