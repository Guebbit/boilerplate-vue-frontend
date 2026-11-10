---
source: src/modules/cart/tests/checkout-errors.spec.ts
sha256: c6e1128f64c30e417c6eb7ad868430c081c30a984a47d012d6d2d828e5ab9487
signature: c6e1128f64c30e417c6eb7ad868430c081c30a984a47d012d6d2d828e5ab9487
generated_at: 2026-11-10T04:03:52.979488+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/checkout-errors.spec.ts

## Purpose

Unit tests for the pure `classifyCheckoutError` function. The function maps a raw server checkout rejection (or a non-object throw) to a small typed verdict; these tests pin that mapping—including the degraded shapes the function must tolerate when the `errors` field is absent, malformed, or carries legacy data. No DOM, no Pinia, no HTTP mocking is involved.

## Key elements

- **`describe('classifyCheckoutError')`** — single test block covering every known error code and several fallback paths.
- **Verdict shapes tested** (each an `it` case): `cart-changed`, `total-changed` (with `expected`/`actual` money objects), `address-not-found`, `billing-address-required`, `shipping-method-weight`, `ship-to-country-not-supported`, `insufficient-stock` (with `lines[]`), `product-unavailable` (with `lines[]`), `open-order-limit` (with `orderIds[]`), `purchase-hold`, `cart-empty`, `in-flight`, `server-error`, and the catch-all `other`.
- **Malformed-input cases** — `CART_TOTAL_CHANGED` with missing or wrong-typed `details`; `CART_INSUFFICIENT_STOCK` lines missing required fields; `CART_PRODUCT_UNAVAILABLE` lines missing `productId` or `title`; `CART_OPEN_ORDER_LIMIT_REACHED` with non-string entries in `orderIds`; non-object rejections (`Error`, string, `undefined`).

## Relationships

- **`src/modules/cart/domain/checkout-errors.ts`** — source of the `classifyCheckoutError` function under test.
- **`src/modules/cart/domain/index.ts`** — barrel re-export; the spec imports `classifyCheckoutError` from `../domain` (this file), which re-exports the implementation from `checkout-errors.ts`.

## Notes

- **Graceful degradation is the contract:** malformed sub-fields never throw. They produce a verdict with `undefined` fields or empty arrays (e.g. `total-changed` with `expected: undefined`, `insufficient-stock` with `lines: []`).
- **`CART_PURCHASE_HOLD` intentionally discards `details`** (`reason`, `until`). The verdict carries only `kind: 'purchase-hold'`; the UI is expected to surface hold info from the buyer's own order record.
- **503 ≠ 500.** A bare `503` with no errors maps to `other`, not `server-error`. Only `500` gets the `server-error` verdict.
- **`CART_PRODUCT_UNAVAILABLE` lines keep a missing `title`** (hard-deleted product) but drop lines missing `productId` entirely.
- **`CART_OPEN_ORDER_LIMIT_REACHED` filters `orderIds` to strings only**, silently dropping numbers or other types.
- The spec is deliberately self-contained (no `mount`, no Pinia) so it runs fast and isolates the classification logic from the view layer, which is covered separately by `cart-view.spec.ts`.
