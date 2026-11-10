---
source: src/modules/cart/domain/quantity.ts
sha256: 0d5010fbb37fb57a2b1e3b7096b1daf67169afe6da0636020bba48adb265b5df
signature: 77f490c8a0b0c210f2e9688c6a37e223bc4c96fdc69982b3ee32ce2782af8f16
generated_at: 2026-11-10T03:57:55.457328+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/domain/quantity.ts

## Purpose

Pure domain rules for cart line quantities. Encapsulates the invariant that stepping a line can never produce zero—zero is a removal, handled by a different call. Exists as a Vue-free module so the rule is testable in isolation.

## Key elements

- **`MIN_LINE_QUANTITY`** (const, `1`) — the floor a line may reach. Below this, the line should be removed rather than updated.
- **`steppedQuantity(quantity, step)`** (pure function) — returns `Math.max(MIN_LINE_QUANTITY, quantity + step)`. Accepts a positive or negative `step`; always clamps the result to the floor.

## Relationships

- **`src/modules/cart/composables/use-line-quantity.ts`** — consumes `steppedQuantity` and `MIN_LINE_QUANTITY` to compute the next quantity when a user clicks a stepper.
- **`src/modules/cart/domain/index.ts`** — barrel re-exports this module so other domain consumers import from a single path.
- **`src/modules/cart/tests/quantity.spec.ts`** — unit-tests the clamping behavior of `steppedQuantity`.

## Notes

- **Clamp, don't guard.** The function deliberately clamps rather than throwing or returning `null`. A double-click can outrun the UI's `disabled` attribute; the domain layer is the last line of defense.
- **Zero is not a valid stepped result.** If you need to remove a line, call the removal path—not `steppedQuantity(q, -q)`.
- **Pure by design.** No Vue, no store, no side effects. See `docs/theory/domain-layer.md` for the layering contract.
