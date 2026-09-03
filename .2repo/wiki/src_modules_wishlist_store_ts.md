# src/modules/wishlist/store.ts

## Purpose

Pinia setup-store that holds a visitor's saved products. Every mutating action (add, remove, move-to-cart) discards the local list and replaces it wholesale with the payload the API returns — no optimistic local state. The store exposes a minimal surface: the item list, an O(1) "is this saved?" check, and four API-backed actions.

## Key elements

- **`useWishlistStore`** — `defineStore('wishlist', …)` (setup syntax). The single public export.
- **`items`** — `ref<WishlistItem[]>`; the saved lines. Always overwritten by an API response, never mutated in place.
- **`savedProductIds`** — `computed` `Set<string>` of product IDs, giving constant-time membership tests.
- **`isSaved(productId)`** — heart-icon read: returns `true` if the product is currently saved.
- **`fetchWishlist()`** — calls `getWishlist()` via `fetchAny`; stores the response items.
- **`addToWishlist(productId)`** — calls `addWishlistItem`; idempotent server-side, so repeated calls converge to the same list.
- **`removeFromWishlist(productId)`** — calls `removeWishlistItem`; replaces the list with the new payload.
- **`moveToCart(productId)`** — calls `moveWishlistItemToCart`, replaces the local list, **then** calls `useCartStore().fetchCart()` so the header cart badge reflects the server-side cart change before the promise resolves.
- **`loading`** — reactive flag managed by `useStructureRestApi`, wired into the app-wide `useCoreStore` loading state.

## Relationships

- **`src/modules/wishlist/index.ts`** — barrel/entry point for the wishlist module; re-exports `useWishlistStore` (and any type re-exports) so consumers import from the module root rather than reaching into the store file directly.

## Notes

- The store deliberately does **not** update cart state locally. `moveToCart` is the only action that reaches into another store (`useCartStore`) and its sole reason is to refetch the cart so the UI badge cannot lag a write this store initiated.
- `fetchAny` (from `@guebbit/vue-toolkit`) is the uniform wrapper: it manages the shared `loading` flag and serialises concurrent calls.
- `items` are `WishlistItem` records carrying at least a `productId`; the view is responsible for joining them against its own product data.
- Because every action trusts only the API's returned list, two rapid mutations (e.g. add then immediately remove) each receive the authoritative server state — no stale local bookkeeping to reconcile.
