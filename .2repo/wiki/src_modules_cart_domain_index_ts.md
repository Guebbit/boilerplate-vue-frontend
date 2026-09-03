# src/modules/cart/domain/index.ts

## Purpose

Barrel (re-export) file for the cart domain layer. It serves as the single public entry point so consumers can import cart domain rules without knowing the internal file layout, while keeping the domain layer's "pure rules" boundary explicit.

## Key elements

- **Re-exports from `./quantity`:** `MIN_LINE_QUANTITY` (constant) and `steppedQuantity` (function) — quantity-related pure domain logic.
- **Re-exports from `./checkout-errors`:** `classifyCheckoutError` (function) and the types `CheckoutErrorVerdict`, `CheckoutShortfallLine` — classification logic for checkout-failure scenarios.
- The file contains **no logic of its own**; it is purely an aggregation surface.

## Relationships

- **`src/modules/cart/domain/quantity.ts`** — Source of `MIN_LINE_QUANTITY` and `steppedQuantity`. This index re-exports both as the public API for quantity rules.
- **`src/modules/cart/domain/checkout-errors.ts`** — Source of `classifyCheckoutError` and the two checkout-error types. This index re-exports them so callers need only import from this file.

## Notes

- The module JSDoc (`@module`) declares a lint-enforced boundary: no Vue, Pinia, axios, or any other tier may be imported from this file or its re-exported siblings. Importers should treat this as the *only* sanctioned path into the cart domain layer.
- `CheckoutErrorVerdict` and `CheckoutShortfallLine` are **type-only** exports (`export type`); they have no runtime cost.
