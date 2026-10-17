---
source: tests/unit/infrastructure/utils/day-range.spec.ts
sha256: 2d3ef907d20dcafca68c67f08acb6900f5a1087977c2b489b31afff69bb5e63a
generated_at: 2026-10-17T02:39:04.260566+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/utils/day-range.spec.ts

## Purpose

Vitest unit tests for the `startOfDayInstant` / `endOfDayInstant` pair in `@/infrastructure/utils/day-range.ts`, verifying that a calendar day maps to its first and last local millisecond, and that any input that is not a real calendar day yields `undefined` (i.e. "no filter").

## Key elements

- **`describe('startOfDayInstant')`** — asserts the return equals local midnight (`00:00:00.000`) of the given day.
- **`describe('endOfDayInstant')`** — asserts the return equals `23:59:59.999` of the same day, that `getDate()` still reports the original day (boundary does not roll over), and that a leap day (`2024-02-29`) is preserved.
- **`describe.each` block ("the %s of a day that does not exist")** — parameterised over both functions and a list of invalid/undefined inputs (`undefined`, `''`, `'abc'`, `'2026-02-30'`, `'2025-02-29'`, `'2026-13-01'`, `'2026-3-5'`), asserting each returns `undefined`.

## Relationships

No graph neighbors recorded.

## Notes

- All expected values are built with the **local-time** `Date` constructor (no `Date.UTC`), so the tests are timezone-sensitive. CI or dev machines in different zones will still pass because both the SUT and the assertion use the same local interpretation, but the absolute UTC instants differ by zone.
- The invalid-input matrix treats non-zero-padded months/days (`'2026-3-5'`) as *invalid*, encoding the convention that only strict `YYYY-MM-DD` strings are accepted.
- The `?? ''` in `new Date(... ?? '')` is a defensive unbox; `Date('')` would throw if the function returned `null` instead of `undefined`, but the tests assert `undefined` in the negative cases so this path is only hit in the positive cases where a value is present.
