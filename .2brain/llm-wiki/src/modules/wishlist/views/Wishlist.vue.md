---
source: src/modules/wishlist/views/Wishlist.vue
sha256: a4a4999eef478be8ee96005e1e52ccdfaa63323c61ae7afa2e36499ebf49da9d
signature: a4a4999eef478be8ee96005e1e52ccdfaa63323c61ae7afa2e36499ebf49da9d
generated_at: 2026-11-10T06:21:54.269639+00:00
model: ollama:qwen3.8:27b
---

# src/modules/wishlist/views/Wishlist.vue

## Purpose

Wishlist page view. Renders the saved lines (product IDs) from the wishlist store, resolves their display titles and availability from the products store, and exposes two per-line actions: move-to-cart and remove. Handles the empty state, a shared in-flight loading lock, and a single above-the-list error alert.

## Key elements

- **`WishlistPage`** (named default export) — stable component name for devtools / `<KeepAlive>`; declared in the plain `<script>` block because `<script setup>` cannot set one.
- **`handleMoveToCart(productId)`** — calls `moveToCart`, toasts success, or reports a blocking error.
- **`handleRemove(productId)`** — calls `removeFromWishlist`, toasts success, or reports a blocking error.
- **`onMounted` hook** — fetches the wishlist, then batch-loads the saved products' records via `loadProducts` so each line has a title.
- **`lineActionError` / `reportLineActionError` / `clearLineActionError`** — single `useBlockingError` instance shared by both actions; rendered once above the list (not per-row).
- **`productsListTo`** (computed) — route to the products list; `undefined` (button hidden) when the `products` module is absent from the build.
- **`productTargetTo(productId)`** — route to a single product page; `undefined` (title renders as plain text) when the `products` module is absent.
- **Template** — `ListEmptyState` for zero items; `v-card` list otherwise, each showing title, availability chip, and the two action buttons.

## Relationships

- **`src/modules/wishlist/store.ts`** — Primary data source. Provides `fetchWishlist`, `removeFromWishlist`, `moveToCart`, `items`, and the shared `loading` flag. The view is a pure consumer; all mutations go through the store.
- **`src/modules/wishlist/tests/wishlist-view.spec.ts`** — Unit/integration spec that exercises this view's rendering, empty state, availability chips, and action handlers.

## Notes

- **Dual script blocks.** The plain `<script>` exists solely to set `name: 'WishlistPage'`; `<script setup>` cannot do this. Don't remove it when refactoring.
- **Shared loading flag.** `moveToCart` and `removeFromWishlist` both set the store's single `loading` ref, so performing one action disables *all* buttons until it settles.
- **Availability gating.** Only `availability === 'removed'` disables the move-to-cart button; sold-out, not-available, and no-longer-available lines remain movable.
- **Conditional product links.** `linkIfRouted` guards both `ProductsList` and `ProductTarget` routes. On a build without the `products` module the empty-state CTA vanishes and titles render as plain `<span>` text rather than dead links.
- **IDs only.** The wishlist store holds product IDs; the view never assumes it owns product records. Titles, availability labels, and product objects all come from `useProductLines()` (products store).
