---
source: tests/support/unit/track-stores.ts
sha256: 7f87d9018a2f72472339ba10ad7e90c02e961203baab5007ecb9dd5a198cd2ca
generated_at: 2026-10-17T02:29:12.902439+00:00
model: ollama:qwen3.8:27b
---

# tests/support/unit/track-stores.ts

## Purpose

Provides a small helper that tracks every cart store a spec creates so they can all be `$dispose()`d after the case, preventing the `storage` listener each store attaches to `globalThis` from leaking across tests.

## Key elements

- **`CartStore`** (type) — alias for `ReturnType<typeof useCartStore>`; used to type the tracked array.
- **`trackStores()`** (exported) — returns an object with two methods:
  - `fresh()` — calls `useCartStore()`, pushes the result into an internal array, and returns the new store.
  - `disposeAll()` — iterates the tracked stores, calls `$dispose()` on each, and resets the array. Intended to be called from `afterEach`.

## Relationships

- **Imports** `useCartStore` from `@/modules/cart/store` (the Pinia store composable).
- **Consumed by** every cart unit spec that creates one or more store instances:
  - `src/modules/cart/tests/guest-cart-store.spec.ts`
  - `src/modules/cart/tests/store-checkout-key.spec.ts`
  - `src/modules/cart/tests/store-double-seed.spec.ts`
  - `src/modules/cart/tests/store-interleavings.spec.ts`
  - `src/modules/cart/tests/store-late-answer.spec.ts`
  - `src/modules/cart/tests/store-stale-answer.spec.ts`
  - `src/modules/cart/tests/store-stock-poll.spec.ts`

## Notes

- Deliberately kept in its own file (not merged into `cart-interleave.ts`) because `cart-interleave.ts` imports the generated API client, which breaks specs that partially mock `@api`.
- `disposeAll` is idempotent by design (it clears the array after disposing), so calling it twice in a row is safe.
