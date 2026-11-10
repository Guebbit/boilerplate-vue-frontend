---
source: tests/unit/infrastructure/utils/day-range.spec.ts
sha256: 2d3ef907d20dcafca68c67f08acb6900f5a1087977c2b489b31afff69bb5e63a
signature: 2d3ef907d20dcafca68c67f08acb6900f5a1087977c2b489b31afff69bb5e63a
generated_at: 2026-11-10T08:04:32.062528+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/utils/day-range.spec.ts

## Purpose

Vitest spec that pins down the contract of `startOfDayInstant` / `endOfDayInstant`: a valid ISO date string maps to the first and last local instant of that calendar day, and any string that does not represent a real day yields `undefined` (meaning "no filter applied").

## Key elements

- **`startOfDayInstant` (imported)** — expected to return the local-midnight epoch-ms for a given day.
- **`endOfDayInstant` (imported)** — expected to return `23:59:59.999` local time, still on the same calendar date.
- **Leap-day case** — asserts `2024-02-29` is handled correctly by `endOfDayInstant`.
- **Invalid-input matrix** (`describe.each` + `it.each`) — both functions must return `undefined` for: `undefined`, `''`, non-date text, impossible dates (`2026-02-30`, `2025-02-29`), out-of-range month (`2026-13-01`), and a non-zero-padded month (`2026-3-5`).

## Relationships

None — the dependency graph lists no neighbors for this file.

## Notes

- The SUT functions return `number | undefined`; callers use the nullish `?? ''` guard before constructing a `Date`. Tests treat `undefined` as the "no filter" sentinel, so the production code must not return `0` or `NaN` for invalid input.
- All expectations are against **local** time (constructor arguments without a UTC flag), not UTC. The assertions compare two `Date` objects built the same way, so they are timezone-stable.
- The non-padded form `'2026-3-5'` is explicitly rejected — the parser does not accept single-digit month/day.
