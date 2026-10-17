---
source: src/modules/wishlist/store.ts
sha256: 9a278851db384460c7a727101fce62132c53a59e3e8666f4423ee63f8f2c5c8b
generated_at: 2026-10-17T01:54:45.843630+00:00
model: ollama:qwen3.8:27b
---

# src/modules/wishlist/store.ts

## Purpose

Pinia store (composition-API style) that holds the viewer's wishlist as a list of `WishlistItem` objects and exposes the add / remove / move-to-cart mutations. Every mutating action replaces the local list wholesale with whatever the API returns rather than patching it locally, and `moveToCart` additionally refetches the cart store so the header badge stays in sync with the write.

## Key elements

- **`useWishlistStore`** – The Pinia store (`defineStore('wishlist', …)`). Exposes `items`, `isSaved`, `loading`, and the five actions below.
- **`items`** – `ref<WishlistItem[]>`; the single source of truth for saved lines.
- **`savedProductIds` / `isSaved(productId)`** – A `Set`-backed `computed` for O(1) "is this saved?" checks (what a heart icon reads).
- **`fetchWishlist()`** – Unconditional `GET /wishlist` through `replaceItems`.
- **`ensureWishlist()`** – Memoised read: first caller triggers `fetchWishlist`, subsequent callers reuse the same in-flight or resolved promise. Resets to `undefined` on failure or viewer change so the next call re-reads.
- **`addToWishlist(productId)`** – `PUT /wishlist/{productId}` via `replaceItems`.
- **`removeFromWishlist(productId)`** – `DELETE /wishlist/{productId}` via `replaceItems`.
- **`moveToCart(productId)`** – Moves the line server-side, then calls `useCartStore().fetchCart()` before resolving, guaranteeing the cart badge reflects the new state.
- **`replaceItems(call)`** – Internal helper: wraps a generated client call in `fetchAny` and guards the write with `tickets.take()` so a stale response can never overwrite a newer one.
- **`tickets`** (`createRequestTickets()`) – Ordering guard; a response is discarded if a newer request has already landed or the viewer changed.
- **`useResetOnViewerChange`** – On viewer switch: resets tickets, clears `items`, and invalidates the `shared` promise so the next person's first ask hits the server.

## Relationships

- **`WishlistToggle.vue`** – Consumes `isSaved` to render the filled/empty heart and calls `addToWishlist` / `removeFromWishlist` on click.
- **`Wishlist.vue`** – The view that reads `items` (joining against product data it holds), calls `ensureWishlist` / `fetchWishlist` on mount, and triggers `moveToCart` from the "Move to cart" action.
- **`useCartStore`** (cart module) – `moveToCart` is the *only* cross-module dependency: after the server confirms the move, the cart store is refetched so its badge and line list are authoritative.
- **`useResetOnViewerChange`** (infrastructure) – Subscribes to viewer identity changes to wipe all local wishlist state.
- **`createRequestTickets`** (infrastructure) – Provides the stale-response guard used by every write path.
- **Test specs** (`store.spec.ts`, `store-ordering.spec.ts`, `move-to-cart-checkout-key.spec.ts`, `wishlist-toggle.spec.ts`, `wishlist-view.spec.ts`) – Cover read/write flows, ordering guarantees, the cart-refetch side-effect, and component integration.

## Notes

- The store stores **ids + minimal line data only**; the view is responsible for joining against full product data. Do not expect rich product fields on `items`.
- `ensureWishlist` is intentionally separate from `fetchWishlist`: components that only need to know *whether* a product is saved (e.g., a grid of hearts) call `ensureWishlist` so fifty hearts share one `GET`; components that must force a fresh read call `fetchWishlist`.
- `moveToCart` returns the **wishlist** items (post-mutation), not the cart items. The cart store is refetched as a side-effect but the store's own return value stays wishlist-shaped.
- All mutations are server-authoritative: the store never optimistically inserts or removes a line. A failed mutation simply leaves the previous list intact.
