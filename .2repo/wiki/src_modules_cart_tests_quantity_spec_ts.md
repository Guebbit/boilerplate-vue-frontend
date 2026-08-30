# src/modules/cart/tests/quantity.spec.ts

## Purpose

Unit tests for the `steppedQuantity` rule and the `MIN_LINE_QUANTITY` constant in the cart domain. Tests are pure — no component mounting, no Pinia store, no HTTP — and assert the arithmetic contract of the step function (increment, decrement, floor clamping) rather than any `Cart.vue` rendering behavior.

## Key elements

- **`describe('steppedQuantity')`** — single test suite covering the step function.
- **Steps up / steps down** — basic `+1` / `-1` arithmetic assertions.
- **Clamps at the floor** — verifies `steppedQuantity(1, -1)` returns `MIN_LINE_QUANTITY` instead of `0`, modeling the double-click-outruns-`disabled`-guard scenario.
- **Clamps on large overshoot** — `steppedQuantity(2, -50)` still lands at `MIN_LINE_QUANTITY`.
- **Lifts below-floor input** — defensive case: `steppedQuantity(0, -1)` is corrected back up to `MIN_LINE_QUANTITY`.
- **Imports** — `steppedQuantity`, `MIN_LINE_QUANTITY` from `@/modules/cart/domain`; `describe`, `it`, `expect` from `vitest`.

## Relationships

- **`@/modules/cart/domain`** (via `import { steppedQuantity, MIN_LINE_QUANTITY }`) — the sole dependency; this spec exercises that module's public exports in isolation. No other files are imported or referenced.

## Notes

- The floor is tested through the clamp (output of `steppedQuantity`), **not** through a separate predicate, because `Cart.vue` compares against `MIN_LINE_QUANTITY` inline and relies on `steppedQuantity` to be the last line of defense.
- The "lifts a line that is already below the floor" case is explicitly labeled defensive — it guards against an invariant that *should* never be violated by the UI but could be hit via direct state manipulation or a race.
- Tests are written as flat `it` blocks (no nested `describe`), keeping the suite a single logical group.
