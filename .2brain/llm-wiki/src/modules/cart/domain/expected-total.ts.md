---
source: src/modules/cart/domain/expected-total.ts
sha256: dacf7c39846f500eef397e071163901b3ec2412c91b2d864e91bb66c5dbd20aa
signature: 4a415a8bea12dfd3815f4b6d5cea955dcd3e51a7c0927580b9df2532cd8ef69d
generated_at: 2026-11-10T03:57:13.235252+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/domain/expected-total.ts

## Purpose

A type-only module that exports the `ExpectedTotal` shape sent in the `POST /cart/checkout` request body. It pairs a decimal-string amount (at the currency's places) with its ISO-4217 code so the server can compare the buyer's cart summary against what it would actually charge and return a `409 CART_TOTAL_CHANGED` on mismatch.

## Key elements

- **`ExpectedTotal`** (type export) — Defined as `CheckoutRequest['expectedTotal']` from `@types`. Represents a `{ amount: string, currency: string }` wire object (the exact property shape lives in the `@types` package, not here).

## Relationships

- **`src/modules/cart/domain/index.ts`** — Barrel file; re-exports `ExpectedTotal` so other cart-domain consumers can import it from the module root.
- **`src/modules/cart/domain/checkout-errors.ts`** — Defines the `CART_TOTAL_CHANGED` error (the 409 the server returns when the echoed `ExpectedTotal` doesn't match the server-computed total).
- **`src/modules/cart/composables/use-checkout-refusals.ts`** — Consumes the 409 refusal (including `CART_TOTAL_CHANGED`) to drive UI state after a failed checkout attempt.

## Notes

- This file contains **no runtime code** — only a type alias. It will be erased at compile time.
- The amount is a *decimal string* (not a number) to preserve exact minor-unit precision on the wire.
- The source of truth for the concrete property names (`amount`, `currency`, etc.) is `CheckoutRequest['expectedTotal']` in `@types`; this file merely re-surfaces it under a domain-meaningful name.
