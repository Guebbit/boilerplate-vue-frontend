---
source: src/modules/cart/domain/quantity.ts
sha256: 0d5010fbb37fb57a2b1e3b7096b1daf67169afe6da0636020bba48adb265b5df
generated_at: 2026-10-02T14:58:18.843581+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/domain/quantity.ts

## Purpose

Pure, framework-free rules for computing a cart line's next quantity. It enforces the invariant that a line can never be stepped to zero — reaching zero is a removal operation, not a quantity update — and exists so that clamping logic lives in one testable, side-effect-free location.

## Key elements

- **`MIN_LINE_QUANTITY`** (exported const) — The floor value (`1`). Below this, the caller should remove the line rather than update it.
- **`steppedQuantity(quantity, step)`** (exported fn) — Returns the new quantity after applying `step`, clamped to `MIN_LINE_QUANTITY` via `Math.max`. Never returns `0` or a negative number.

## Relationships

- **`src/modules/cart/domain/index.ts`** — Barrel file for the cart domain module; re-exports `MIN_LINE_QUANTITY` and `steppedQuantity` so callers can import from the domain root rather than reaching into individual files.

## Notes

- The clamp is deliberate: a double-click can outrun a UI `disabled` guard, so the domain function itself is the final safety net. Don't remove the `Math.max` in favor of "trust the caller."
- Zero is intentionally unrepresentable through this function. If a caller needs to set quantity to `0`, that is a removal call handled elsewhere — do not special-case zero here.
- Referenced theory: `docs/theory/domain-layer.md` explains the "pure, no Vue, no store" contract for this layer.
