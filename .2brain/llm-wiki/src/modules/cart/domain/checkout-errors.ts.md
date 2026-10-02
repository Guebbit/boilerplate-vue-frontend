---
source: src/modules/cart/domain/checkout-errors.ts
sha256: 8a1c24f9b4adc558f03f5d62d6a9f8c457a03a036b92c0e92c9aa34acc6b5176
generated_at: 2026-10-02T14:57:52.099645+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/domain/checkout-errors.ts

## Purpose

Classifies a checkout rejection (the value thrown by `cartStore.checkout()`) into a typed, discriminated-union verdict that the view layer can branch on. The file is pure: it reads the error envelope, narrows wire payloads, and returns a verdict object. It produces no user-facing copy and performs no side effects.

## Key elements

- **`CheckoutShortfallLine`** (interface) — one line of a stock shortfall: `productId`, `title`, `requested`, `available`. All fields required.
- **`UnavailableCartLine`** (interface) — one line of a refused product: `productId` (required) and `title` (optional — absent for hard-deleted products).
- **`CheckoutErrorVerdict`** (type) — discriminated union of eight kinds: `cart-changed`, `insufficient-stock`, `address-not-found`, `billing-address-required`, `shipping-method-weight`, `ship-to-country-not-supported`, `product-unavailable`, `other`. The two stock/product kinds carry a `lines` array; the rest are empty markers.
- **`classifyCheckoutError(error: unknown)`** (exported function) — the sole public entry point. Reads `error.errors[0].code`, maps it to a verdict, and validates any `details.lines` payload via the internal narrows. Falls through to `{ kind: 'other' }` for any unrecognised code.
- **`asShortfallLine`**, **`asUnavailableLine`**, **`firstErrorItem`** (module-private) — runtime narrowing helpers that validate `unknown` wire values before they are cast to their typed interfaces.

## Relationships

- **`src/modules/cart/domain/index.ts`** — barrel file for the `cart/domain` module; re-exports this file's public symbols (`classifyCheckoutError`, `CheckoutErrorVerdict`, the two line interfaces) so consumers can import from the module root.
- **`@api/error-codes`** — provides the `ERROR_CODES` constants that `classifyCheckoutError` compares against.

## Notes

- **Wire-trust boundary:** every value crossing from the API envelope is treated as `unknown` and validated by the private narrows before being placed into a typed object. Never assume `details.lines` is well-shaped.
- **`title` asymmetry:** required on `CheckoutShortfallLine`, optional on `UnavailableCartLine`. Code that renders both kinds must handle the absence of `title` in the latter.
- **`other` is intentional, not an error:** it covers `CART_EMPTY`, `CART_SHIPPING_METHOD_NOT_FOUND`, transport failures, and any future code the classifier doesn't yet know. The view is expected to show a generic toast for this verdict.
- **Stdlib `Array.isArray` quirk:** the comment in `firstErrorItem` notes that the standard-library typing narrows to `any[]`, so the element is re-read through an explicit `unknown[]` cast rather than destructured directly.
