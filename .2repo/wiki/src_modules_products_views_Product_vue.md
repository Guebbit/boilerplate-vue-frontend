# src/modules/products/views/Product.vue

## Purpose

Public product detail page (route component `ProductTargetPage`). Renders the product record fetched by the products store and exposes the two storefront visitor actions — add to cart and toggle wishlist — by delegating to their owning module stores.

## Key elements

- **`heroTitle` / `heroDescription` / `productStatus`** – Computed properties that derive the hero heading, subheading, and status-chip label from `currentProduct`, falling back to the route `id` or i18n defaults.
- **`outOfStock`** – Computed; `true` only when `available === 0`. An absent/`null` `stock` is treated as unconstrained (not sold out).
- **`handleAddToCart()`** – Calls `upsertCartItem(id, 1)` from the cart store; reports success or error via the notifications store.
- **`handleToggleWishlist()`** – Toggles wishlist membership via `addToWishlist` / `removeFromWishlist`; the heart icon itself is the success feedback, so only errors produce a toast.
- **`onMounted` hook** – Fire-and-forget `fetchWishlist()` when the visitor is authenticated, so the heart icon reflects saved state. Not a load dependency.
- **Template** – Composes `LayoutDefault` → `ItemDetailLayout` with slots for hero, stats (price, stock, active flag, created date), action buttons (add-to-cart, wishlist toggle), a detail grid (`CardDetail` + `ItemDetailField`), an aside panel, and navigation actions (edit / back-to-list).

## Relationships

- **`src/infrastructure/utils/logger.ts`** – Listed as a graph neighbor; no direct import or call is visible in this file's source, so the link is transitive (likely through the Pinia stores or error-handling utilities this page depends on).

## Notes

- The component is **guest-restricted**: both `handleAddToCart` and `handleToggleWishlist` are gated behind `isAuth`. Guests see a "log in to buy" hint instead of the buttons.
- `outOfStock` intentionally treats a missing `available` field as *not* sold out, mirroring the checkout rule so legacy rows without the column don't all appear unavailable.
- Wishlist fetch on mount is `void`-prefixed (fire-and-forget); a failure does not block page render.
- The `id` prop is optional; the page still renders (with fallback title) until `watchProduct` resolves.
