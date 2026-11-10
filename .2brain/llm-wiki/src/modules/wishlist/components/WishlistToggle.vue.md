---
source: src/modules/wishlist/components/WishlistToggle.vue
sha256: e9f4b68748a6cac004b81e919fa57724e4424c0cb740f5f77387c9b048005089
signature: c1311543a63f95dab050da829c3296bd629d18ae647b8bc656a2d829f9e27f4f
generated_at: 2026-11-10T06:18:41.387662+00:00
model: ollama:qwen3.8:27b
---

# src/modules/wishlist/components/WishlistToggle.vue

## Purpose

A single heart-toggle button that saves or unsaves the current product to/from the user's wishlist. It is contributed to the `product-actions` slot via the wishlist module's manifest, so the products module owns the page and never imports the wishlist. The component renders nothing for guests.

## Key elements

- **`handleToggle()`** — Toggles the product's saved state by calling `wishlist.addToWishlist` or `wishlist.removeFromWishlist` depending on `wishlist.isSaved(product.id)`. Catches the rejection into `reportError` (in-place blocking error). Clears any prior error before acting.
- **`onMounted` hook** — Calls `wishlist.ensureWishlist()` (fire-and-forget) when the user is authenticated. Shared across a grid of hearts so the single read is issued once per mount.
- **`loading` (from `storeToRefs(wishlist)`)** — Acts as the double-click guard; disables the button while a toggle is in flight.
- **`useBlockingError()`** — Provides `message` (shown in `<InlineErrorAlert>`), `report`, and `clear` for the toggle's own failed-state display.
- **Template** — Conditionally rendered (`v-if="isAuth"`). Uses a Vuetony `v-btn` with a `Heart` icon whose `fill` toggles on saved state; `aria-label` switches between save/unsave i18n strings. `data-test` hooks: `wishlist-toggle` and `wishlist-toggle-error`.

## Relationships

- **`src/modules/wishlist/store.ts`** — Imports `useWishlistStore` (as `wishlist`) and reads its `loading` ref and `isSaved` / `addToWishlist` / `removeFromWishlist` / `ensureWishlist` members. All wishlist state lives there; this component is a thin UI shell over it.
- **`src/modules/wishlist/tests/wishlist-toggle.spec.ts`** — Unit/integration spec that exercises this component (toggle behavior, guest visibility, error display, double-click guard).

## Notes

- The component is **slot-contributed** (via the module manifest), not directly imported by the products module. Do not expect a direct import edge in the product page source.
- `ensureWishlist` is intentionally fire-and-forget (eslint-disable on floating promises); it toasts a failure once internally, so the caller never handles rejection.
- The `loading` flag from the store is the **only** in-flight guard; there is no local `busy` ref.
- For guests the entire component is absent from the DOM (not just hidden), so no CSS or layout shift occurs.
