---
source: src/modules/cart/composables/use-guest-cart.ts
sha256: 19d5ac6eed07a49d25f36a6ac77399d039c2d75e0e4d8c8326abe1c1721a8b41
signature: 538e9fe9d956412f1505a82015f6aebbb55a67a8cd29e9d077ae7a616061981b
generated_at: 2026-11-10T03:55:59.922528+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/composables/use-guest-cart.ts

## Purpose

A Vue composable that manages the signed-out visitor's cart as a `{ productId, quantity }` list persisted to `localStorage`. It exposes reactive state, CRUD actions, cross-tab synchronisation, and an idempotency-key helper for merging the guest cart into a server cart. It is invoked inside the cart store's `setup`, so its lifecycle is bound to the store; the store itself owns the network call (`mergeGuestCart`).

## Key elements

- **`useGuestCart()`** (sole export) — Returns a bundle of refs, computeds, and actions for the guest cart. Must be called within a Vue effect scope (the store's setup) so the `storage`-event listener is cleaned up automatically.
- **`guestLines`** (`ref<GuestCartLine[]>`) — The single source of truth for the cart; only ever replaced, never mutated in place.
- **`guestQuantity` / `hasGuestLines`** (computed) — Derived unit count and empty-check.
- **`addGuestItem(productId, quantity)`** — Adds or grows a line via `addGuestLine`; returns `false` if the distinct-product cap is hit and the item is new.
- **`updateGuestItem` / `removeGuestItems` / `clearGuestCart`** — Set, drop, or clear lines using the pure domain helpers.
- **`mergeKeyFor(lines)`** — Returns a stable `Idempotency-Key` (UUID) for a given line set. The key + line body are written to storage (`writeMergeAttempt`) so a page reload retries the *same* call; a different body generates a fresh key.
- **`onStorage`** (internal) — Listens to the `storage` event and re-reads the cart when another tab writes the same key or clears storage entirely.

## Relationships

- **`src/modules/cart/domain/index.ts`** — The direct import target (`'../domain'`); provides `addGuestLine`, `setGuestLineQuantity`, `removeGuestLines`, `guestCartQuantity`, and the `GuestCartLine` type.
- **`src/modules/cart/domain/guest-cart.ts`** — The underlying module that `domain/index.ts` re-exports; contains the actual pure line-manipulation logic. This composable holds no domain logic itself.
- **`src/modules/cart/guest-cart-storage.ts`** — Provides `readGuestCart`, `writeGuestCart`, `readMergeAttempt`, `writeMergeAttempt`, and `GUEST_CART_STORAGE_KEY`. All `localStorage` I/O is delegated there.
- **`src/modules/cart/store.ts`** — Calls `useGuestCart()` inside its `setup()` and consumes the returned refs/actions. The store is responsible for the server-facing `mergeGuestCart` call; this composable only prepares the idempotency key.

## Notes

- The `watch` on `guestLines` uses a single-parameter arrow (`(lines) => writeGuestCart(lines)`) deliberately; Vue's `watch` callback otherwise passes the *previous* value as a second argument, which would land in `writeGuestCart`'s clock parameter.
- `mergeKeyFor` compares `JSON.stringify(lines)` against the stored attempt body. Line *order* matters for key stability — callers should pass lines in a deterministic order.
- The `storage` event only fires in *other* documents/tabs, not the one that performed the write, so there is no self-feedback loop.
- The composable is not designed for use outside the cart store's effect scope; calling it at component level would leak the `storage` listener if the component unmounts without the scope disposing.
