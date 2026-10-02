---
source: src/modules/cart/tests/checkout-errors.spec.ts
sha256: 045ddb42f0f24184e3a4a6700e0084658cec27864dcb36207443e9bffb4ebf3c
generated_at: 2026-10-02T15:00:54.171651+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/checkout-errors.spec.ts

## Purpose

Vitest suite that verifies `classifyCheckoutError` (from `@/modules/cart/domain`) correctly maps raw checkout API rejections — including malformed or missing `errors` fields that cross a wire boundary untyped — into the verdict objects the cart view consumes. No DOM, Pinia, or HTTP mocks are involved; it is a pure function-in / value-out test.

## Key elements

- **`classifyCheckoutError` (imported, not defined here)** — the SUT. Accepts an arbitrary rejection value (typed error object, `Error` instance, string, `undefined`) and returns a classified verdict object with a `kind` discriminator (and optionally `lines`).
- **Named-code tests** — one `it` per known server error code (`CART_CHANGED`, `CART_ADDRESS_NOT_FOUND`, `CART_BILLING_ADDRESS_REQUIRED`, `CART_SHIPPING_METHOD_WEIGHT`, `CART_SHIP_TO_COUNTRY_NOT_SUPPORTED`) asserting the exact `kind` string produced.
- **Detail-extraction tests** — `CART_INSUFFICIENT_STOCK` (reads `details.lines` with `productId`, `title`, `requested`, `available`) and `CART_PRODUCT_UNAVAILABLE` (reads `details.lines` with `productId`, `title`).
- **Shape-tolerance tests** — confirm that a line missing required fields is silently dropped (empty `lines` array) rather than throwing, and that a `title: undefined` is preserved for hard-deleted products.
- **Fallback tests** — `CART_EMPTY`, a plain `Error('Network Error')`, a bare string, and `undefined` all resolve to `{ kind: 'other' }`.

## Relationships

No graph neighbors are recorded for this file. The sole import is `classifyCheckoutError` from `@/modules/cart/domain` (the barrel re-export of `src/modules/cart/domain/checkout-errors.ts`). The header comment references `cart-view.spec.ts` as the complementary view-level test.

## Notes

- The suite is intentionally written against *untyped* wire values: several tests pass shapes the server might send that the local type doesn't model (missing `requested`/`available`, missing `productId`, a bare string). This is the file's reason for existing alongside the view spec.
- Tests use `toEqual` (deep equality), so the returned verdict must contain *exactly* the asserted keys — no extra fields are expected.
- The `@module` JSDoc tag at the top documents the file's role but is not a Vitest construct; it exists for IDE/wiki tooling.
