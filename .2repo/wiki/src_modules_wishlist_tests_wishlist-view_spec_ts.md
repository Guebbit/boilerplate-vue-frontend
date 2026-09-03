# src/modules/wishlist/tests/wishlist-view.spec.ts

## Purpose

Component-level test for the `Wishlist.vue` view. It mounts the page with seeded store state and the app's real route table, then verifies three things: that each saved item's link carries the product **ID** in its `href` while displaying the product **TITLE** in its text, that the generated `href` actually resolves to the `ProductTarget` route (not a catch-all), and that the item list renders correctly (multiple cards, empty state, title-fallback behaviour).

## Key elements

- **`PRODUCT_ID` / `PRODUCT_TITLE`** – Two deliberately different constants. The title is *not* the ID so that any code path that silently falls back to `titleOf(id) === id` will be caught.
- **`router`** – Built with `createMemoryHistory` and the app's own route table (`collectModuleRoutes(enabledModules)` nested under `/:locale`), mirroring how `app/router/index.ts` assembles routes. This ensures link assertions test against the real route definitions.
- **`mountWishlist(productIds)`** – Seeds `wishlist.items` and `cart.productTitles`, mocks `fetchWishlist` and `resolveTitles` so no transport is exercised, then mounts `Wishlist` with router, Vuetify, i18n, and a `LayoutDefault` stub.
- **`beforeEach`** – Creates a fresh Pinia, calls `loadLocale('en')` (so `t()` returns real strings, not keys), and navigates the memory router to `/en/wishlist`.
- **`describe('the link on a saved item')`** – Asserts `href` = `/en/products/{id}`, link text = title, and that `router.resolve(href)` yields `name: 'ProductTarget'` with the correct params.
- **`describe('the item list')`** – Asserts card count, title-fallback for an unresolvable product, `aria-label` content on move-to-cart / remove actions, and the Vuetify `.v-empty-state` when the list is empty.

## Relationships

- **`tests/support/unit/wire-modules.ts`** – Imported at the top of the module and invoked once as `wireModulesIntoCore()`. This registers the enabled modules' stores/components into the core registry *before* the test imports resolve, so `collectModuleRoutes(enabledModules)` returns the full route table the app would use at runtime.

## Notes

- The title ≠ id invariant is load-bearing: if `PRODUCT_TITLE` were set equal to `PRODUCT_ID`, the link-text assertion would pass even if `titleOf` always returned the id, defeating the purpose of the test.
- `loadLocale('en')` in `beforeEach` is essential. Without loaded dictionaries every `t('…')` call renders its own key, so label assertions would compare key-against-key and pass vacuously.
- The second link test (`router.resolve`) exists because a `RouterLink` stub that drops `to` would render an anchor with no `href` and trivially "match" any location. Only a resolved `name` + `params` proves the URL is structurally valid.
- `fetchWishlist` and `resolveTitles` are spied and resolved from the seeded state; the spec is testing the view's rendering logic, not the network/transport layer.
