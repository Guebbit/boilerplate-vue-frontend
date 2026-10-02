---
source: src/modules/cart/domain/index.ts
sha256: 41b97db75b0e68bdf22d6a0e8de9b00644aa3084aec7a509e92ecfe38489e53d
generated_at: 2026-10-02T14:58:06.350019+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/domain/index.ts

## Purpose

Barrel (index) file for the cart domain layer. It re-exports the public API of the domain's submodules so callers import from one entry point. The module JSDoc asserts an architectural invariant: this tier contains pure business rules and must not import Vue, Pinia, axios, or any other tier (enforced by lint).

## Key elements

- **`MIN_LINE_QUANTITY`** — re-exported from `./quantity`; the minimum allowed quantity for a cart line.
- **`steppedQuantity`** — re-exported from `./quantity`; function that returns a quantity stepped up/down within allowed bounds.
- **`classifyCheckoutError`** — re-exported from `./checkout-errors`; maps a raw checkout failure to a structured verdict.
- **Type re-exports** (`CheckoutErrorVerdict`, `CheckoutShortfallLine`, `UnavailableCartLine`) — the checkout-error vocabulary from `./checkout-errors`, re-exported so callers can import types from the domain barrel.

## Relationships

- **`src/modules/cart/domain/quantity.ts`** — source of `MIN_LINE_QUANTITY` and `steppedQuantity`; this file simply re-exports both.
- **`src/modules/cart/domain/checkout-errors.ts`** — source of `classifyCheckoutError` and the three checkout-error types; this file re-exports the function and the types.

## Notes

- The "no framework imports" rule is lint-guaranteed, not merely a convention. If you add a re-export here, ensure the target module also respects the constraint.
- The JSDoc on the type re-export explicitly states callers should import from this barrel rather than reaching into `./checkout-errors` directly.
- Architecture rationale is documented in `docs/theory/domain-layer.md`.
