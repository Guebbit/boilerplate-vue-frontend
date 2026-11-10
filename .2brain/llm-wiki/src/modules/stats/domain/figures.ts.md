---
source: src/modules/stats/domain/figures.ts
sha256: 2b9c2f840cf8f274f38f012e39e09b38198dd9dcbad2605c5e4988dc82cd6ae5
signature: fc3ecacf9aa0bc5b32cafee53931d2b822c4492b5cba48db7d6f50c46ab939aa
generated_at: 2026-11-10T05:48:08.437557+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/domain/figures.ts

## Purpose

Pure helper functions that compute and classify the period-over-period change in a single stat figure. It exists so that display logic (formatting arrows, "no change" labels, etc.) has a small, testable domain layer to call instead of repeating the arithmetic in every component.

## Key elements

- **`percentChange(current: number, previous: number): number | undefined`** — Returns the signed fractional change (e.g. `0.1` for +10 %). Returns `undefined` when `previous` is `0`, because a percentage of zero is not a meaningful number.
- **`isFlat(change: number): boolean`** — Returns `true` when the fraction is below `0.0005`, i.e. it would round to `0.0` at the one-decimal precision the cards display. Used to decide between a "no change" label and a directional arrow.

## Relationships

- **`src/modules/stats/domain/index.ts`** — Barrel file for the `stats/domain` module; re-exports `percentChange` and `isFlat` so consumers can import from the module root.
- **`src/modules/stats/components/SalesSection.vue`** — Presentational component that renders sales figures; calls `percentChange` to derive the delta and `isFlat` to pick the "no change" label vs. an up/down arrow.
- **`src/modules/stats/tests/domain.spec.ts`** — Unit-test suite that exercises both exported functions (including the `previous === 0` guard and the `isFlat` threshold).

## Notes

- `percentChange` intentionally returns `undefined` (not `NaN` or `0`) for the zero-previous case so callers can branch with a simple nullish check.
- The `isFlat` threshold (`0.0005`) is tied to the one-decimal display format in the stat cards. If that precision changes, the constant must be updated to stay in sync.
- Both functions are pure and side-effect-free; no state, no I/O.
