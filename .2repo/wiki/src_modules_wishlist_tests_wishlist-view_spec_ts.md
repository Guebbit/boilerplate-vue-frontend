# src/modules/wishlist/tests/wishlist-view.spec.ts

## Purpose

Unit tests for the `Wishlist.vue` view that verify two critical invariants: each saved-item link's `href` carries the product **ID** while its visible text carries the product **TITLE**, and the rendered href actually resolves to the `ProductTarget` route in the app's real route table. It also covers list rendering, the title-fallback behavior, aria-labels, and the empty state.

## Key elements

- **`PRODUCT_ID` / `PRODUCT_TITLE`** – Constants; the title is deliberately *not* the id so that a fallback-to-id bug would be caught.
- **`router`** – A real `createMemoryHistory` router whose children come from `collectModuleRoutes(enabledModules)` under a `/:locale` parent, mirroring how `app/router/index.ts` assembles routes.
- **`mountWishlist(productIds)`** – Seeds the wishlist and cart stores, mocks `fetchWishlist` / `resolveTitles` so no network is needed, then mounts `Wishlist` with router, Vuetify, i18n plugins and a `LayoutDefault` stub.
- **`beforeEach`** – Resets Pinia, loads the `en` locale (so `t()` calls resolve rather than rendering raw keys), and pushes `/en/wishlist`.
- **`describe('the link on a saved item')`** – Asserts `href` equals `/en/products/{ID}`, visible text equals the title, and `router.resolve(href)` yields `{ name: 'ProductTarget', params: { locale: 'en', id } }`.
- **`describe('the item list')`** – Asserts one card per line, that an unresolved title falls back to the id, that `aria-label`s contain the title, and that the empty state renders with zero cards.

## Relationships

- **`tests/support/unit/wire-modules.ts`** – Imported as `wireModulesIntoCore` and called at module top level before any test runs; it wires cross-module dependencies (store registrations, service bindings) so that `useWishlistStore` and `useCartStore` are available without booting the full application.

## Notes

- The router is intentionally the app's *own* route table (via `collectModuleRoutes`), not a hand-written copy, so a renamed or moved product route will fail these tests rather than silently passing against a stale path.
- `loadLocale('en')` in `beforeEach` is load-bearing: without it every `t()` call returns its key, and any label assertion comparing one key string to another would trivially pass.
- `fetchWishlist` and `resolveTitles` are spied (not replaced with fakes) so the view's `onMounted` lifecycle still runs; the tests exercise the *view*, not the transport.
- The second item in the multi-card test has no seeded title, deliberately exercising the `titleOf(id) === id` fallback documented in `cart/store.ts`.
