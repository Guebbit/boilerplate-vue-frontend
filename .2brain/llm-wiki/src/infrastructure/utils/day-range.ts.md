---
source: src/infrastructure/utils/day-range.ts
sha256: 4d9bce43a6a51a9843676e3c25a6f059dc716f82ec0c11f2058f9c46038c85ee
generated_at: 2026-10-17T00:12:40.646179+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/day-range.ts

## Purpose

Converts a `YYYY-MM-DD` calendar-day string into the first or last local instant of that day (as an ISO 8601 UTC string), providing inclusive `From` / `To` bounds for the staff-list date-range filters (orders, payments). It is a pure utility with no external dependencies.

## Key elements

- **`DAY_PATTERN`** (internal) — Regex `/^(\d{4})-(\d{2})-(\d{2})$/` that validates the shape of a day string.
- **`atTime`** (internal) — Builds a `Date` at a given local time within a day. Returns `undefined` for malformed input or impossible dates (e.g. `2026-02-30`) by detecting month/day rollover.
- **`startOfDayInstant`** (exported) — Returns the ISO-8601 UTC string for local midnight (`00:00:00.000`) of the given day, or `undefined`.
- **`endOfDayInstant`** (exported) — Returns the ISO-8601 UTC string for local end-of-day (`23:59:59.999`) of the given day, or `undefined`.

## Relationships

No graph neighbors.

## Notes

- Days are interpreted in the **browser's local timezone**, not UTC. The shop's intended zone is communicated on the stats pages; the two only diverge for a viewer in a very different zone.
- Both exports return `undefined` (not `null`, not an exception) for empty strings, non-matching formats, and calendar-impossible dates.
- The rollover guard in `atTime` rejects dates where `Date` silently shifted the month or day (e.g. Feb 30 → Mar 2).
- Both functions accept `undefined` as input and gracefully return `undefined` in that case.
