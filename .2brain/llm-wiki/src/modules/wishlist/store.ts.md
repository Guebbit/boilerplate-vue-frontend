---
source: src/modules/wishlist/store.ts
sha256: 7b3888ad8847c9f6688b7637d5b509ae4c62da862e8a931cfeba565972e52e34
signature: 6ef738e8fc4f1af864d31026a686a6c60142371514c54601eb7e44829153f71b
generated_at: 2026-11-10T06:19:28.905220+00:00
model: ollama:qwen3.8:27b
---

# src/modules/wishlist/store.ts

## Purpose

Pinia store (`useWishlistStore`) for the wishlist module. It holds the visitor's saved product ids and exposes toggle, fetch, and move-to-cart actions. Every mutating action replaces the local `items` list wholesale with the payload the API returns, and `moveToCart` additionally refetches the cart store so the header badge reflects the write immediately.

## Key elements

- **`useWishlistStore`** – The Pinia store (setup-style, key `'wishlist'`). Exposes `items`, `isSaved`, `loading`, `fetchWishlist`, `ensureWishlist`, `addToWishlist`, `removeFromWishlist`, `moveToCart`.
- **`items`** (`ref<WishlistItem[]>`) – The saved lines; always overwritten in full by an API response, never mutated in place.
- **`tickets`** (`createRequestTickets()`) – Ordering guard: a slow, older response is discarded if a newer one has already landed; reset on viewer change.
- **`replaceItems(call)`** – Internal helper that runs a request through `fetchAny`, checks the ticket, and assigns `data.items` to `items`.
- **`shared`** (local `let`) – In-flight or completed promise for a single `GET /wishlist`; lets many heart icons share one network call. Invalidated on failure or viewer change.
- **`savedProductIds`** (`computed`) – A `Set` of product ids for O(1) membership checks.
- **`isSaved(productId)`** – Boolean lookup used by heart-icon components.
- **`fetchWishlist`** – Always hits the server via `getWishlist()`.
- **`ensureWishlist`** – Caches the first successful read (or a failure); toasts an error once on failure then forgets the cache. Never rejects.
- **`addToWishlist(productId)`** – Calls `createWishlistItem({ productId })`; idempotent server-side.
- **`removeFromWishlist(productId)`** – Calls `deleteWishlistItem(productId)` to remove a saved line.
- **`moveToCart(productId)`** – Calls `moveWishlistItemToCart(productId)`, then calls `useCartStore().fetchCart()` to keep the badge in sync.
- **`useResetOnViewerChange`** – Clears `tickets`, `items`, and `shared` when the logged-in viewer changes.

## Relationships

- **`@api`** (`getWishlist`, `createWishlistItem`, `deleteWishlistItem`, `moveWishlistItemToCart`) – Generated REST client calls used by every action.
- **`@/modules/cart`** (`useCartStore`) – Imported solely so `moveToCart` can refetch the cart after the server-side move.
- **`@guebbit/vue-toolkit`** (`useStructureRestApi`, `useNotificationsStore`) – Provides the `loading`/`fetchAny` wrapper and the notification sink for error toasts.
- **`@/infrastructure/query-client`** (`queryClient`) – Passed into `useStructureRestApi` so requests participate in the app-wide query cache.
- **`@/infrastructure/utils/use-reset-on-viewer-change`** – Hooks the store's reset logic to the viewer-change event.
- **`@/infrastructure/utils/request-ticket`** (`createRequestTickets`) – Supplies the ordering primitive.
- **`src/modules/wishlist/views/Wishlist.vue`** – Primary consumer; renders the saved lines and calls the store's actions.
- **`src/modules/wishlist/components/WishlistToggle.vue`** – Heart-icon component; reads `isSaved` and calls `addToWishlist` / `removeFromWishlist` / `ensureWishlist`.
- **Tests** (`store.spec.ts`, `store-ordering.spec.ts`, `move-to-cart-checkout-key.spec.ts`, `wishlist-toggle.spec.ts`, `wishlist-view.spec.ts`) – Cover store behavior, ticket ordering, move-to-cart cart refresh, and component interactions.

## Notes

- **Wholesale replace, never merge.** The store never splices or patches `items`; it trusts the API payload as the single source of truth. Do not add optimistic local mutations.
- **`ensureWishlist` vs. `fetchWishlist`.** Components that only need "is this saved?" should use `ensureWishlist` (deduplicates, swallows errors). `fetchWishlist` is the explicit "always ask the server" path (e.g. pull-to-refresh in `Wishlist.vue`).
- **`shared` is a `let`, not a `ref`.** It is internal cache bookkeeping and is intentionally not exposed on the store's public API.
- **Ticket ordering is store-local.** It guards only this store's `items`; it does not coordinate with the cart store's own in-flight requests.
- **`moveToCart` chains two async calls.** The returned promise resolves only after *both* the wishlist move and the cart refetch complete; callers awaiting it will not see a stale badge.
