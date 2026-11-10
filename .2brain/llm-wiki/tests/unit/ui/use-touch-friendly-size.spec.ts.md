---
source: tests/unit/ui/use-touch-friendly-size.spec.ts
sha256: ea9d66248ebb569ccef41667eaeb35b851e8cdd211acd451f23c4c58f45acd4a
signature: 3bcd15f466f8875937c3bb5abe5a356c3b7762ce9e862bc38814a7df1828c831
generated_at: 2026-11-10T08:32:18.470323+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/use-touch-friendly-size.spec.ts

## Purpose

Unit tests for the `useTouchFriendlySize`, `useTouchTarget`, and `useTouchChipSize` composables. Verifies that row-action buttons return `'small'` on wide screens with a fine pointer and `'large'`/`TOUCH_TARGET_PX`/`'x-large'` when the viewport is narrow (`mobile`) or the primary pointer is coarse.

## Key elements

- **`mobile` (ref)** — shared reactive flag standing in for Vuetify's `useDisplay().mobile`; flipped per test case to drive the "narrow screen" path.
- **`stubPointer(coarse: boolean)`** — calls `vi.stubGlobal('matchMedia', …)` so that only the `(pointer: coarse)` query reports `matches: true` when `coarse` is true; uses `asStub` to build a minimal `MediaQueryList` object.
- **`vi.mock('vuetify', …)`** — mocks the entire `vuetify` module so `useDisplay` returns the `mobile` ref.
- **`describe('useTouchFriendlySize')`** — table-driven (`it.each`) tests covering the 4 combinations of width/mobile/coarse, plus a reactivity test confirming the ref updates after creation.
- **`describe('useTouchTarget')`** — asserts the returned value is `undefined` (fine pointer, desktop) or `TOUCH_TARGET_PX` (mobile or coarse).
- **`describe('useTouchChipSize')`** — asserts `'small'` vs `'x-large'` under the same conditions.
- All assertions run inside `effectScope().run(…)` to isolate reactivity per test.

## Relationships

- **`tests/support/stub.ts`** — provides the `asStub` helper used to construct a partial `MediaQueryList` object with only `matches`, `addEventListener`, and `removeEventListener`.

## Notes

- The Vuetify mock returns the *same* `mobile` ref instance every call, which is what allows the "follows the viewport once created" test to observe reactive updates after the composable has already run.
- `stubPointer` must be called inside each test (or before `effectScope().run`) because `vi.stubGlobal` is global; there is no automatic cleanup between table rows in `it.each`.
- The width labels (`'wide'` / `'narrow'`) in test names are cosmetic — the actual condition tested is the boolean `mobile` flag, not a CSS breakpoint.
