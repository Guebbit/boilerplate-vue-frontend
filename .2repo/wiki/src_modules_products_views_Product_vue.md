# src/modules/products/views/Product.vue

## Purpose

Renders the public product detail page. It fetches the product record via the products store when the route `id` changes, displays its fields, and exposes the two visitor write actions (add-to-cart and wishlist toggle) by delegating to the cart and wishlist stores.

## Key elements

- **`heroTitle` / `heroDescription` / `productStatus`** — computed values that derive display text from `currentProduct`, falling back to the route id or i18n strings while data is absent.
- **`watchProduct(() => id)`** — reactive fetch trigger; re-fetches whenever the route `id` prop changes.
- **`outOfStock`** — computed; `true` only when `available === 0`. A missing/`undefined` stock value is treated as unconstrained (not sold out).
- **`handleAddToCart`** — calls `upsertCartItem(id, 1)` from the cart store; success/failure is surfaced as a notification toast.
- **`handleToggleWishlist`** — checks `isSaved(id)` then calls `removeFromWishlist` or `addToWishlist`; only errors produce a toast (the heart icon itself signals success).
- **`onMounted` hook** — fire-and-forget `fetchWishlist()` for authenticated users so the heart state is populated before first render; guests skip the call entirely.
- **Template** — composes `ItemDetailLayout` with hero, stats (`CardMaterialStat`), action buttons, a detail grid (`ItemDetailField`), an aside card, and navigation actions (edit / list) via `routerLinkI18n`.

## Relationships

- **`src/modules/products/store`** — provides `watchProduct` (fetch trigger) and `currentProduct` (reactive record).
- **`src/modules/cart`** — provides `upsertCartItem` for the add-to-cart action.
- **`src/modules/wishlist`** — provides `addToWishlist`, `removeFromWishlist`, `isSaved`, and `fetchWishlist`.
- **`src/infrastructure/stores/session.ts`** — provides `isAuth` to gate cart/wishlist actions and the wishlist fetch.
- **`@guebbit/vue-toolkit` (notifications store)** — `addMessage` is the toast channel for both success and error feedback.
- **`src/infrastructure/utils/errors.ts`** — `notifyErrorMessages` normalizes error payloads into toast messages.
- **`src/infrastructure/utils/formatters.ts`** — `formatText`, `formatDateTime`, `formatCurrency`, `formatFlag` for consistent display.
- **`src/infrastructure/i18n/router-link.ts`** — `routerLinkI18n` builds localized route URLs for the edit/list navigation buttons.
- **`src/ui/…` components** — `LayoutDefault`, `ItemDetailLayout`, `ItemDetailHero`, `CardMaterialStat`, `CardDetail`, `CardInfo`, `ItemDetailField` provide the visual structure.

## Notes

- `outOfStock` intentionally does **not** treat `available === undefined` as sold out. Rows predating the `available` column must remain purchasable; this mirrors the checkout module's rule.
- The wishlist fetch on mount is fire-and-forget (`void`); a failure leaves the heart in its default (unfilled) state rather than blocking the page.
- Add-to-cart is disabled for guests and out-of-stock items; the wishlist button is hidden entirely for guests.
- The component is registered as `ProductTargetPage` (not `Product`), matching the i18n namespace `product-target-page.*`.
