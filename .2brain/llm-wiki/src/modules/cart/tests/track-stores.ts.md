---
source: src/modules/cart/tests/track-stores.ts
sha256: 76ccab015bc19f2550eca6d1f85cd6abb9399034ceeb1df5093c1d4705376ca8
signature: bdf67ae119050a431bffd9c90b3ed2f0d9d3c508bc9e1062b7b33bb1ecb4c070
generated_at: 2026-11-10T04:12:21.339736+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/track-stores.ts

## Purpose

A tiny test helper that tracks every cart store a spec creates and disposes them all together after each case. Without it, the `storage` listener each store attaches to `globalThis` would leak across tests. It lives in its own file (rather than in `cart-interleave.ts`) because that sibling imports the generated API client, which breaks specs that partially mock `@api`.

## Key elements

- **`trackStores`** (exported) — Returns a pair of methods:
  - **`fresh()`** — Creates a cart store via `useCartStore()`, records it in an internal array, and returns it.
  - **`disposeAll()`** — Calls `$dispose()` on every tracked store and resets the array. Intended to be called from `afterEach`.
- **`CartStore`** (local type) — `ReturnType<typeof useCartStore>`; used only for typing the internal `created` array.

## Relationships

- **`src/modules/cart/store.ts`** — Imports `useCartStore`, the sole production dependency of this file.
- **Spec files** (`guest-cart-store.spec.ts`, `store-add-key.spec.ts`, `store-checkout-key.spec.ts`, `store-double-seed.spec.ts`, `store-interleavings.spec.ts`, `store-late-answer.spec.ts`, `store-stale-answer.spec.ts`, `store-stock-poll.spec.ts`) — Consumers. Each calls `trackStores()` at the top of its `describe` block, uses `fresh()` to obtain stores under test, and registers `disposeAll` in `afterEach`.

## Notes

- The only reason this file exists separately from `cart-interleave.ts` is the import-isolation concern: that sibling pulls in the generated API client, which is incompatible with specs that partially mock `@api`.
- `disposeAll` is idempotent (a second call disposes an empty array), so it is safe to call unconditionally in `afterEach` even when a test failed before `fresh()` was called.
