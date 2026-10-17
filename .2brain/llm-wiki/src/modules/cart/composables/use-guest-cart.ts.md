---
source: src/modules/cart/composables/use-guest-cart.ts
sha256: 787a868111f8d4acf24304ee48d8b8d659c1d861b01ebce20d845239234a1f9e
generated_at: 2026-10-17T00:34:45.444005+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/composables/use-guest-cart.ts

## Purpose

Vue composable that manages the signed-out visitor's cart (a `{ productId, quantity }` list) persisted in `localStorage`. It exposes reactive state, CRUD actions, cross-tab synchronisation, and idempotency-key management for the server merge call. It is instantiated inside the cart store's setup, so its lifetime is bound to the store.

## Key elements

- **`useGuestCart()`** — single exported factory; returns reactive refs, computed properties, action functions, and the merge-key helper for the calling scope.
- **`guestLines`** (`ref<GuestCartLine[]>`) — the cart contents; only ever replaced wholesale, watched to persist on every change.
- **`guestQuantity`** / **`hasGuestLines`** — computed totals and emptiness flag.
- **`addGuestItem(productId, quantity)`** — appends or grows a line via the domain `addGuestLine`; returns `false` if the distinct-product cap is hit and the product is new.
- **`updateGuestItem` / `removeGuestItems` / `clearGuestCart`** — quantity update, multi-line removal, and full clear; each replaces `guestLines` with the domain function's result.
- **`mergeKeyFor(lines)`** — returns an `Idempotency-Key` for the guest-cart merge API call. Reuses a previously stored key if the serialised body matches; otherwise generates a fresh `crypto.randomUUID()` and persists it so a page reload doesn't lose it.
- **`onStorage` listener** — listens for the browser `storage` event (fires in *other* tabs only) to adopt another tab's cart state and prevent write-overwrite races. Removed via `onScopeDispose`.

## Relationships

- **`guest-cart-storage.ts`** — supplies `readGuestCart`, `writeGuestCart`, `readMergeAttempt`, `writeMergeAttempt`, and the `GUEST_CART_STORAGE_KEY` constant that this composable imports for all `localStorage` I/O.
- **`domain/guest-cart.ts`** (re-exported via **`domain/index.ts`**) — provides the pure, side-effect-free line-manipulation functions (`addGuestLine`, `setGuestLineQuantity`, `removeGuestLines`, `guestCartQuantity`) and the `GuestCartLine` type. This composable contains no domain rules; it delegates all list arithmetic there.
- **`store.ts`** — calls `useGuestCart()` inside its `setup()` so the cart state lives and dies with the store. The store is the only part that talks to the server (`mergeGuestCart`); this composable prepares the data and the idempotency key but never issues a network request.

## Notes

- The list is **only ever replaced** (no in-place mutation), which is why a single `watch` on the ref is sufficient for persistence—no deep watching needed.
- The `storage` event fires in every tab *except* the one that wrote; this composable relies on that to sync without an explicit bus.
- `mergeKeyFor` serialises with `JSON.stringify` as its identity check—property order matters. Callers must pass lines in a stable order for the key to be correctly reused.
- Because the composable attaches a global `storage` listener, calling `useGuestCart()` multiple times in the same scope would register duplicate listeners (though `onScopeDispose` cleans them up on scope teardown). In practice it is called exactly once, inside the store.
