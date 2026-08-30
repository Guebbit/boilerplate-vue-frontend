# src/modules/wishlist/views/Wishlist.vue

## Purpose

Page-level view that renders the user's saved products (wishlist). It fetches the saved product IDs on mount, resolves display titles via the cart store's title cache, and provides two actions per item: move-to-cart and remove. Uses Vuetify components and the default site layout.

## Key elements

- **`WishlistPage`** (default export) — Vue SFC component; the `<script>` block sets the component name, `<script setup>` holds all logic.
- **`handleMoveToCart(productId)`** — Calls `moveToCart` from the wishlist store; shows a success toast or routes the error to `notifyErrorMessages`.
- **`handleRemove(productId)`** — Calls `removeFromWishlist`; same toast/error pattern.
- **`onMounted` hook** — Fetches the wishlist, then calls the cart store's `resolveTitles` with the product IDs so `titleOf()` can render names.
- **`titleOf` / `resolveTitles`** (from `useCartStore`) — The wishlist stores only product IDs; titles are joined from the cart store's product-title cache.
- **Template** — Empty state (`v-empty-state` with "go to products" CTA) or a list of `v-card` rows, each with a product link, a "Move to cart" button, and a "Remove" button.

## Relationships

- **`src/modules/wishlist/store.ts`** — Primary data source; provides `items`, `fetchWishlist`, `removeFromWishlist`, `moveToCart`.
- **`src/modules/cart`** — Supplies the product-title cache (`titleOf`, `resolveTitles`) used to display names and build aria-labels.
- **`src/infrastructure/utils/errors.ts`** — `notifyErrorMessages` is the shared error-to-toast formatter for both action handlers.
- **`@guebbit/vue-toolkit`** — `useNotificationsStore` provides `addMessage` for all toast output.
- **`src/infrastructure/i18n/router-link.ts`** — `routerLinkI18n` wraps route objects for locale-aware navigation.
- **`src/infrastructure/utils/logger.ts`** (graph neighbor) — Not directly imported by this file; error reporting flows through `errors.ts` instead.

## Notes

- The wishlist is deliberately **ID-only**; it never stores product names. All display titles depend on the cart store having resolved them. If a title hasn't been resolved yet, `titleOf()` will return a fallback.
- `resolveTitles` is called once in `onMounted` with the full ID list; there is no per-item lazy resolution.
- The component name is `WishlistPage` (set in the options `<script>` block), distinct from the file name `Wishlist.vue`.
- All user-facing strings go through `vue-i18n` (`t('wishlist-page.*')`); no hardcoded text in the template.
