---
source: src/modules/cart/domain/checkout-attempt.ts
sha256: 21abc509cbb71b7c4e9ad365f9659657f248f695d9db66af3345b1b3201081f2
signature: 36625a7af53cb37d53763495717efe9753cd338ff6cfcf7a88825650aed7d6a3
generated_at: 2026-11-10T03:56:34.861197+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/domain/checkout-attempt.ts

## Purpose

Defines the **fingerprint** of a checkout attempt — a canonical string that identifies "the same order" for idempotency purposes. The server binds an `Idempotency-Key` to a request body and replays the recorded response on repeat; this fingerprint is what the client compares to decide whether a repeat key is still valid (same order) or has been invalidated (cart changed). The module is intentionally pure: it computes a string from inputs and touches no storage, no store, no I/O.

## Key elements

- **`checkoutFingerprint(body, cart) → string`** (exported) — Serialises the three things that define an order into a stable JSON string:
  - `body` — the `CheckoutRequest` (or `null` if absent)
  - `lines` — cart items reduced to `[productId, quantity]` pairs
  - `shipping` — `cart.shipping.selected`

  Two calls return equal strings if and only if they represent the same order. Any external mutation (wishlist, stock poll, merge, reorder) that changes the cart automatically changes the fingerprint without the writer needing to opt in.

## Relationships

- **`src/modules/cart/domain/index.ts`** — Barrel that re-exports `checkoutFingerprint` so consumers import from the domain namespace rather than this file directly.
- **`src/modules/cart/checkout-attempt-storage.ts`** — Persists/retrieves recorded fingerprints for idempotency replay. This file does **not** import from it; the dependency points the other direction (storage consumes the fingerprint this module produces).
- **`src/modules/cart/tests/expected-total.spec.ts`** — Exercises the fingerprint logic (and related checkout math) in unit tests.

## Notes

- The fingerprint is a **comparison token, not a hash**: it is `JSON.stringify` of a fixed-shape object. Do not treat it as opaque or reorder the object keys without a migration.
- Cart items are reduced to only `productId` and `quantity`; other item fields (display name, price, metadata) are deliberately excluded so cosmetic changes don't invalidate the key.
- `body` is included verbatim. If the request body carries volatile fields (timestamps, client IDs), they will be part of the fingerprint and will break replay. Keep `CheckoutRequest` stable.
- Referenced design doc: `docs/modules/cart-checkout.md`.
