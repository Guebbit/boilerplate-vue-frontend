# src/modules/wishlist/views/Wishlist.vue

## Purpose

The wishlist page view. It renders the user's saved product lines (by ID), joining each against the cart store's product-title cache to display a readable name, and exposes two per-item actions: move-to-cart and remove. It handles the empty state with a CTA back to the product listing.

## Key elements

- **`handleMoveToCart(productId)`** — Calls `moveToCart` on the wishlist store; on success pushes a localized toast, on failure routes the error through `notifyErrorMessages`.
- **`handleRemove(productId)`** — Calls `removeFromWishlist` on the wishlist store; same toast/error pattern as above.
- **`onMounted` hook** — Fetches the wishlist, then calls `resolveTitles` on the cart store with the collected product IDs so `titleOf` has data to return during render.
- **`titleOf` / `resolveTitles`** (from `useCartStore`) — The join mechanism: the wishlist store returns bare IDs; the cart store holds the `productId → title` cache.
- **Template** — `LayoutDefault` wrapper; `v-empty-state` (with `Heart` icon and a "go to products" button) when `items` is empty; otherwise a `v-for` of `v-card` rows, each linking to `ProductTarget` via `routerLinkI18n` and showing the two action buttons.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — Listed as a graph neighbor but not directly imported or referenced in this file; no visible interaction.

## Notes

- The wishlist store intentionally stores only product IDs (no denormalized titles). Titles are resolved at render time from the cart store's cache via `resolveTitles`. If the cart store's cache is cold and `resolveTitles` hasn't populated an entry, `titleOf` may return a fallback/empty string until it resolves.
- `onMounted` chains `fetchWishlist → resolveTitles`; the component does not gate the list render on the title-resolution promise, so titles can appear momentarily blank before filling in.
- All user-facing strings go through `vue-i18n` (`t()`); no hardcoded text in the template.
- Buttons carry `data-test` attributes (`wishlist-item`, `wishlist-move-to-cart`, `wishlist-remove`) for e2e selectors.
