---
source: src/modules/payments/domain/payment-errors.ts
sha256: b063866136a677ae60a8fa376b9d824cf2219d2219a2254d5cd9d81c908afe57
generated_at: 2026-10-02T15:29:15.681139+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/domain/payment-errors.ts

## Purpose

Classifies a rejected "start paying" API response into a narrow, view-ready verdict. It is a pure module: it inspects the error envelope's `errors[0]`, maps it to a discriminated union, and delegates all user-facing copy and side-effects to the calling view.

## Key elements

- **`UnavailableOrderLine`** (interface) – A single product line flagged as having no sellable product. Carries `productId` and a `title` guaranteed to exist (sourced from the order's frozen snapshot, not the live catalogue).
- **`PaymentErrorVerdict`** (type) – Discriminated union the view renders from: `{ kind: 'product-unavailable'; lines: UnavailableOrderLine[] }` or `{ kind: 'other' }`. `other` is the catch-all for declines, transport failures, and any other code without a dedicated UI.
- **`classifyPaymentError(error: unknown): PaymentErrorVerdict`** (export) – The sole public entry point. Reads the first structured error item, checks for `ERROR_CODES.ORDER_PRODUCT_UNAVAILABLE`, extracts and narrows `details.lines`, and returns the verdict. Everything that doesn't match returns `{ kind: 'other' }`.
- **`firstErrorItem`** (private) – Safely reads `error.errors[0]` with duck-typing (no `instanceof`), returning `undefined` on any shape mismatch.
- **`asUnavailableLine`** (private) – Narrows one `unknown` array entry to `UnavailableOrderLine | undefined`.

## Relationships

- **`src/modules/payments/domain/index.ts`** – Barrel file for the payments domain; re-exports `classifyPaymentError`, `PaymentErrorVerdict`, and `UnavailableOrderLine` so consumers can import from the domain root.
- **`src/modules/returns/tests/returnable-lines.spec.ts`** – Appears in the dependency graph as a consumer of types/structures defined here (or a sibling in the same shared shape family).

## Notes

- **Stdlib `Array.isArray` quirk:** The narrowing inside `firstErrorItem` re-reads the element through an `unknown` cast rather than destructuring from the `any[]` the standard-lib typings produce. This is intentional and documented inline.
- **`title` is always present** on `UnavailableOrderLine` because it is read from the order's own frozen line snapshot at the time of the rejection; the code never falls back to a live catalogue lookup.
- **No copy is produced here.** The module is deliberately copy-free so that i18n / phrasing changes stay in the view layer.
- **Same shape as `cart/domain/checkout-errors.ts`** – if you change the narrowing pattern, keep the two modules in sync.
