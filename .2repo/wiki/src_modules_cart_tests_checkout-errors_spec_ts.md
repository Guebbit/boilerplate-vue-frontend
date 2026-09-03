# src/modules/cart/tests/checkout-errors.spec.ts

## Purpose

Unit tests for `classifyCheckoutError`, a pure decision function in the cart domain. Given a rejection value (any shape that might cross a wire boundary), it asserts the returned "verdict" object. No DOM, no Pinia, no HTTP—just input → output. The companion `cart-view.spec.ts` proves the view reacts correctly to each verdict; this file proves the verdict itself is correct, including malformed or absent `errors` payloads.

## Key elements

- **`describe('classifyCheckoutError', …)`** — single test block covering one function imported from `@/modules/cart/domain`.
- **Named-code cases** — asserts `CART_CHANGED` → `{ kind: 'cart-changed' }`, `CART_ADDRESS_NOT_FOUND` → `{ kind: 'address-not-found' }`.
- **`CART_INSUFFICIENT_STOCK` case** — verifies the function extracts `details.lines` verbatim into the verdict's `lines` array.
- **Malformed-line case** — a line missing `requested`/`available` is silently dropped (yields `lines: []`) rather than throwing.
- **Fallback-to-`'other'` cases** — covers `CART_EMPTY` (no dedicated mapping), a transport `Error` with no `errors` field, and bare non-object rejections (`'rejected'`, `undefined`).

## Relationships

No graph neighbors are registered for this file. Its sole runtime import is `classifyCheckoutError` from `@/modules/cart/domain` (the unit under test).

## Notes

- The file deliberately tests *untyped* inputs (strings, `undefined`, bare `Error`) because the value crosses a network boundary; the classifier must never throw.
- "Drops rather than throws" is an explicit contract: a shortfall line that doesn't match the expected shape is filtered out, not surfaced as a crash.
- Verdict `kind` values are kebab-case strings (`'cart-changed'`, `'address-not-found'`, `'insufficient-stock'`, `'other'`), not the raw API codes.
- Paired with `cart-view.spec.ts` by design: this file owns *classification correctness*, that file owns *view reaction*. Keep them in sync when adding a new error code.
