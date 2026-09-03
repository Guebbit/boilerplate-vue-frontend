# src/modules/cart/domain/quantity.ts

## Purpose

Defines the quantity rules for a single cart line. It is a pure domain module (no Vue, no store) that enforces the minimum-quantity floor and handles the step operation. It exists so that the invariant "a line never reaches zero by stepping" lives in one place and is testable without UI or state dependencies.

## Key elements

- **`MIN_LINE_QUANTITY`** (constant, value `1`) — the floor below which a line is removed rather than updated.
- **`steppedQuantity(quantity: number, step: number): number`** — returns `Math.max(MIN_LINE_QUANTITY, quantity + step)`. Used to compute the next quantity after a +1 / −1 (or arbitrary) step, clamped so the result never drops below the floor.

## Relationships

- **`src/modules/cart/domain/index.ts`** — barrel file that re-exports this module's symbols, making `MIN_LINE_QUANTITY` and `steppedQuantity` available to consumers that import from the domain index.

## Notes

- **Zero is a removal, not a quantity.** A line must never land on `0` via `steppedQuantity`; the correct way to remove a line is a separate "remove" call. This is an intentional domain rule, not an implementation accident.
- **Clamping is defensive, not just cosmetic.** The comment notes that a double-click can outrun a UI `:disabled` guard, so the clamp in `steppedQuantity` is the authoritative guard against sub-minimum values.
- **Pure function.** No side effects, no framework imports. Safe to unit-test in isolation.
