# src/modules/cart/domain/quantity.ts

## Purpose

Pure domain rules governing cart line quantities. It encodes a single invariant: a line's quantity has a floor of 1, and stepping can never produce zero (zero is a *removal*, handled by a different call). The module is intentionally framework-free — no Vue, no store.

## Key elements

- **`MIN_LINE_QUANTITY`** (const, `1`) — the lower bound a line may hold. Any value below this signals "remove the line" rather than "update it."
- **`steppedQuantity(quantity, step)`** — returns `Math.max(MIN_LINE_QUANTITY, quantity + step)`. Accepts a signed step (positive or negative) and clamps the result to the floor. Pure function, no side effects.

## Relationships

- **`src/modules/cart/domain/index.ts`** — barrel file that re-exports this module (and its siblings) so consumers import from the domain root rather than individual files.

## Notes

- The `Math.max` clamp is a **defensive guard**, not just an API contract. The file comment explains the motivation: a fast double-click can land a second `steppedQuantity` call before the UI disables the button, so the value is clamped rather than trusted.
- Stepping to zero is *impossible* by design. If a line's quantity reaches 1 and the user steps down, the result is still 1. Removal is a separate, explicit operation handled elsewhere.
- Because the module is pure and has no imports, it is trivially testable in isolation with no mocks.
