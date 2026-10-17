---
source: src/modules/cart/domain/checkout-errors.ts
sha256: a751762089955c6cf8f2486279f8b84e669728dc12890a37242a55df7c069fe3
generated_at: 2026-10-17T00:35:30.331826+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/domain/checkout-errors.ts

## Purpose

Classifies a checkout rejection (the value thrown by `cartStore.checkout()`) into one of the API's documented error shapes and returns a typed verdict the view can act on. It is a pure, side-effect-free mapping from wire-format error to a domain-level decision; it reads `error.errors[0]`, validates the payload defensively, and produces no user-facing copy.

## Key elements

- **`classifyCheckoutError(error: unknown): CheckoutErrorVerdict`** — The sole entry point. Reads `error.errors[0]`, matches its `code` against `ERROR_CODES`, and returns the corresponding verdict. Falls through to `server-error` (status 500) or `other`.
- **`CheckoutErrorVerdict`** — A discriminated union (14 variants) covering every documented refusal plus `cart-empty`, `in-flight`, `server-error`, and `other`. Variants that carry data (`total-changed`, `insufficient-stock`, `product-unavailable`, `open-order-limit`) include typed payloads.
- **`ShortfallAvailability`** — `Extract<LineAvailability, 'insufficient_stock' | 'out_of_stock' | 'unavailable'>`; the three stock-related refusals a shortfall line can name.
- **`CheckoutShortfallLine`** — Shape of one `CART_INSUFFICIENT_STOCK` detail line (productId, title, requested, availability).
- **`UnavailableCartLine`** — Shape of one `CART_PRODUCT_UNAVAILABLE` detail line; `title` is optional (hard-deleted products have none).
- **Internal guards** (`isShortfallAvailability`, `asShortfallLine`, `asUnavailableLine`, `asMoney`, `firstErrorItem`) — Narrow unknown wire values to the typed shapes above. All treat the payload as untrusted and return `undefined` on mismatch.

## Relationships

- **`expected-total.ts`** — Provides the `ExpectedTotal` type consumed by the `total-changed` verdict's `expected`/`actual` fields.
- **`store.ts`** — `cartStore.checkout()` is the caller whose `.catch` feeds the rejected value into `classifyCheckoutError`.
- **`views/Cart.vue`** — The consuming view; it switches on `verdict.kind` to decide which UI path to render. This file deliberately produces no copy so the view retains that decision.
- **`index.ts`** — Barrel that re-exports this module for consumers outside the cart domain.
- **`tests/checkout-errors.spec.ts`** — Unit tests exercising each verdict branch and the defensive guards.

## Notes

- All wire fields are narrowed from `unknown`; no field from the API response is trusted without a runtime check. A malformed line is silently filtered out rather than throwing.
- `title` is **required** on `CheckoutShortfallLine` but **optional** on `UnavailableCartLine` — this asymmetry is intentional and reflected in the two separate guards.
- The `server-error` check reads `error.status` directly (not from `errors[0]`), because a bare 500 may not carry a structured body.
- The `Array.isArray` cast to `unknown[]` before indexing is a workaround for the stdlib typing quirk where `Array.isArray` narrows to `any[]`; the code comments flag this explicitly.
- The module is pure: it imports no Vue, no store, no side-effectful library. It can be unit-tested without any mocking of the network layer.
