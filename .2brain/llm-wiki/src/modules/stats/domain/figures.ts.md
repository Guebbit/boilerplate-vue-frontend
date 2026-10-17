---
source: src/modules/stats/domain/figures.ts
sha256: 2b9c2f840cf8f274f38f012e39e09b38198dd9dcbad2605c5e4988dc82cd6ae5
generated_at: 2026-10-17T01:41:34.438031+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/domain/figures.ts

## Purpose

Pure helper functions that compute and classify period-over-period figure changes for the stats cards. Extracted from the domain layer so the math lives alongside the data shapes rather than in presentation code.

## Key elements

- **`percentChange(current, previous)`** — Returns the change as a signed fraction (e.g. `0.1` = +10%) relative to the absolute value of the previous period. Returns `undefined` when `previous` is `0`, since a percentage against zero is undefined.
- **`isFlat(change)`** — Returns `true` when `|change| < 0.0005`, i.e. the value rounds to `0.0` at the one-decimal precision the stat cards display. Used to swap an up/down arrow for a "no change" label.

## Relationships

- **`src/modules/stats/domain/index.ts`** — Re-exports `percentChange` and `isFlat` as part of the stats domain public API, so consumers import from the barrel rather than this file directly.
- **`src/modules/stats/components/SalesSection.vue`** — Calls `percentChange` to derive each card's delta and `isFlat` to decide whether to render a "no change" indicator or a directional arrow.
- **`src/modules/stats/tests/domain.spec.ts`** — Unit-tests both functions, covering the zero-previous edge case and the `isFlat` threshold.

## Notes

- `percentChange` divides by `Math.abs(previous)`, so a move from −200 to −100 yields `+0.5`, not a negative fraction. The sign reflects direction of improvement, not the sign of the denominator.
- The `isFlat` threshold (`0.0005`) is chosen so that any value which would round to `0.0` at one decimal is treated as flat; it is not a configurable constant.
