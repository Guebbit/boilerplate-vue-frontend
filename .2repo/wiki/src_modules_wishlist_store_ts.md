# src/modules/wishlist/store.ts

## Purpose

Pinia store for the wishlist module. It holds the visitor's saved product lines (IDs only) and exposes CRUD actions. Every mutating action discards local state and replaces it wholesale with the list the API returns, guaranteeing the store never diverges from the server.

## Key elements

- **`useWishlistStore`** – The exported Pinia store (setup syntax, id `'wishlist'`).
- **`items`** – `ref<WishlistItem[]>` holding the saved lines.
- **`savedProductIds`** – Computed `Set<string>` derived from `items` for O(1) membership checks.
- **`isSaved(productId)`** – Boolean helper; the primary read the heart-icon UI calls.
- **`fetchWishlist()`** – GET the wishlist; populates `items`.
- **`addToWishlist(productId)`** – POST a product; replaces `items` with the response. Idempotent server-side.
- **`removeFromWishlist(productId)`** – DELETE a product; replaces `items` with the response.
- **`moveToCart(productId)`** – Server-side move of a wishlist line into the cart. After the wishlist update, explicitly calls `useCartStore().fetchCart()` so the header badge reflects the new cart immediately.
- **`loading`** – Shared loading flag from `useStructureRestApi` (backed by `useCoreStore`).

## Relationships

- **`src/modules/wishlist/index.ts`** – Re-exports `useWishlistStore` so consumers import from the module barrel rather than reaching into `store.ts` directly.

## Notes

- The store never merges or patches `items`; each action does `items.value = response.data.items`. There is no optimistic update path.
- `moveToCart` is the **only** action that touches a second store (`useCartStore`). All other actions are self-contained within the wishlist domain.
- `savedProductIds` is a computed `Set`, not a `Map`. It exists solely for the `isSaved` read; do not add write-side logic to it.
- Loading state is managed through `useCoreStore`'s `getLoading`/`setLoading` pair, not a local boolean.
