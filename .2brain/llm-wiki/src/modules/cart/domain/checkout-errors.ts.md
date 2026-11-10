---
source: src/modules/cart/domain/checkout-errors.ts
sha256: 056566d34fde56baf9fc357fd0491f6bbf1cd032233ab1c0b4fffb25bd958708
signature: 155af0d6b038c10d9a2f82d2dadbf2891ef63b8e03e699d9d877374a8da054e5
generated_at: 2026-11-10T03:57:00.046178+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/domain/checkout-errors.ts

## Purpose

Pure classifier that takes the raw rejection thrown by `cartStore.checkout()` and returns a typed `CheckoutErrorVerdict` the view can branch on. It reads only `errors[0]` from the API envelope, performs all wire-data narrowing, and produces no user-facing copy — the view layer decides messaging and behavior per verdict.

## Key elements

- **`CheckoutErrorVerdict`** — Discriminated union of 15 verdict kinds (`cart-changed`, `total-changed`, `insufficient-stock`, `address-not-found`, `billing-address-required`, `shipping-method-weight`, `ship-to-country-not-supported`, `product-unavailable`, `open-order-limit`, `purchase-hold`, `cart-empty`, `in-flight`, `server-error`, `other`).
- **`classifyCheckoutError(error: unknown): CheckoutErrorVerdict`** — The sole public entry point. Looks up `errors[0].code` in `VERDICT_BY_CODE`, falls back to `server-error` for bare 500s, then `other`.
- **`VERDICT_BY_CODE`** — `ReadonlyMap<unknown, (details) => CheckoutErrorVerdict>` mapping each `ERROR_CODES` constant to a details-extracting function.
- **`CheckoutShortfallLine` / `UnavailableCartLine`** — Interfaces describing per-line detail payloads for stock and availability refusals. `title` is optional on `UnavailableCartLine` (hard-deleted products).
- **`ShortfallAvailability`** — `Extract<LineAvailability, 'insufficient_stock' | 'out_of_stock' | 'unavailable'>`.
- **Internal narrowing helpers** — `firstErrorItem`, `detailOf`, `listDetail`, `asShortfallLine`, `asUnavailableLine`, `asMoney`, `asOrderId`. All treat wire data as `unknown` and return `undefined` on shape mismatch.

## Relationships

- **`src/modules/cart/domain/expected-total.ts`** — Imports the `ExpectedTotal` type used in the `total-changed` verdict's `expected`/`actual` fields.
- **`@api/error-codes`** — Imports `ERROR_CODES` constants that serve as the lookup keys in `VERDICT_BY_CODE`.
- **`src/modules/cart/composables/use-checkout-refusals.ts`** — Consumes `classifyCheckoutError` and the verdict types to drive refusal UX logic.
- **`src/modules/cart/components/SignedInCart.vue`** — The view that renders the verdict (the doc comment explicitly defers copy/behavior to "the view").
- **`src/modules/cart/store.ts`** — Source of the rejection; the doc comment names `cartStore.checkout()` as the throwing call.
- **`src/modules/cart/idempotent-calls.ts`** — Provides the `IDEMPOTENCY_IN_FLIGHT` error code mapped to the `in-flight` verdict.
- **`src/modules/cart/domain/index.ts`** — Barrel re-export for the cart domain module.
- **`src/modules/cart/tests/checkout-errors.spec.ts`** — Unit tests for the classifier.

## Notes

- `VERDICT_BY_CODE` is a `Map`, not a plain object, deliberately: error codes arrive as untrusted wire strings, so a key like `"toString"` must not resolve via the prototype chain.
- Every `details` field is treated as `unknown` and narrowed explicitly; no field is assumed to exist beyond what the helper checks.
- `Array.isArray` in the TS stdlib typings narrows its argument to `any[]`; the code re-casts through `unknown[]` to avoid a real `any` leak (noted inline).
- The file is strictly pure — no side effects, no i18n strings, no DOM access.
