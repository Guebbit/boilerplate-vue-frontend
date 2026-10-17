---
source: src/modules/wishlist/views/Wishlist.vue
sha256: 5b6c8bb63a62cb78715a078410957063cec22c31235eb9b7af64dad0d96e5b6a
generated_at: 2026-10-17T01:56:17.563899+00:00
model: ollama:qwen3.8:27b
---

# src/modules/wishlist/views/Wishlist.vue

## Purpose

Renders the user's saved wishlist as a list of product cards. Each card shows the product title (pulled from the products store by id), an availability chip, and two actions—move-to-cart and remove. Exists as the single-page UI entry point for the wishlist module.

## Key elements

- **`WishlistPage`** (named component block) — stable name for `<KeepAlive>` and devtools; required because `<script setup>` cannot declare its own name.
- **`productsListTo`** (computed) — catalogue link target for the empty-state CTA; resolves to `undefined` when the `products` module is absent, hiding the button.
- **`productTargetTo(productId)`** — per-item link to the product detail page; also `undefined`-guarded for builds without the `products` module.
- **`handleMoveToCart(productId)`** — calls `moveToCart` from the wishlist store; on success fires a toast, on failure reports into the shared `lineActionError` slot.
- **`handleRemove(productId)`** — calls `removeFromWishlist`; same toast/error pattern.
- **`lineActionError` / `reportLineActionError` / `clearLineActionError`** — single `useBlockingError` instance shared by both actions, rendered as one `InlineErrorAlert` above the list.
- **`onMounted`** — fetches the wishlist, then batch-loads all referenced products via `loadProducts` so titles are available for rendering.
- **Template** — `v-empty-state` for zero items; per-item `v-card` with conditional `router-link` vs plain-text title, availability `v-chip` (info for `preorder`, warning otherwise), and action buttons gated by `session.can('update', 'Cart')` and `item.availability !== 'removed'`.

## Relationships

- **`src/modules/wishlist/store.ts`** — Primary data source. Consumes `fetchWishlist`, `removeFromWishlist`, `moveToCart` actions and the `items` / `loading` refs via `storeToRefs`. The shared `loading` flag disables all action buttons while either request is in flight.
- **`src/modules/wishlist/tests/wishlist-view.spec.ts`** — Unit / component spec for this view; exercises the render, action handlers, and error-display logic described above.
- **`src/infrastructure/utils/logger.ts`** — Listed as a graph neighbor but **not imported** by this file; no direct interaction.

## Notes

- The wishlist store returns only product **ids**; titles, availability, and release dates all come from the products store (`useProductLines`). This is the same indirection the cart page uses.
- `productsListTo` and `productTargetTo` are both `undefined`-guarded via `linkIfRouted`. The template renders plain text (no dead link) when the `products` module is not part of the current build.
- Both actions share **one** `useBlockingError` instance rather than per-row alerts, because the list has no per-row slot for an inline error and must remain interactive during a failed action.
- The move-to-cart button is hidden entirely (not just disabled) when the session lacks the `update:Cart` permission—staff can keep a wishlist but have no basket.
- `removed` availability is the **only** state that blocks move-to-cart; `sold-out` and `not-available` lines can still be moved, matching the domain rule that off-sale ≠ non-movable.
