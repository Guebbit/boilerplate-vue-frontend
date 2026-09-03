# src/modules/cart/tests/quantity.spec.ts

## Purpose

Unit tests for the `steppedQuantity` cart-domain function. It verifies the arithmetic and floor-clamping behavior of the quantity stepper as a pure function (no component mount, no Pinia, no HTTP), ensuring the guard holds even when a double-click outruns the `disabled` attribute on `Cart.vue`.

## Key elements

- **`steppedQuantity`** (imported from `@/modules/cart/domain`) — the single function under test; takes a current quantity and a step delta, returns the clamped result.
- **`describe('steppedQuantity')`** — Vitest suite with five `it` blocks:
  - *steps up* — positive step increments.
  - *steps down* — negative step decrements.
  - *clamps at the floor instead of reaching zero* — step from 1 by −1 stays at 1.
  - *clamps however far the step overshoots* — step from 2 by −50 stays at 1.
  - *lifts a line that is already below the floor* — a quantity already at 0 is brought back up to 1.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The floor value is asserted as the literal `1` (mirroring `openapi.yaml` `minimum: 1`), **not** via the module's own `MIN_LINE_QUANTITY` constant. This is deliberate: if the constant ever drifts from the OpenAPI contract, this test must fail.
- The file explicitly avoids testing the `disabled` attribute on `Cart.vue`; the contract is "the rule returns a valid quantity," not "the UI prevented the click."
- No test setup, no mocks, no async — all cases are synchronous pure-function calls.
