---
source: src/modules/wishlist/tests/wishlist-view.spec.ts
sha256: 599f4692b7de816f2147aaab18a13e73a94e52800f529f77a52fca22890b30d5
generated_at: 2026-10-17T01:56:05.834928+00:00
model: ollama:qwen3.8:27b
---

# src/modules/wishlist/tests/wishlist-view.spec.ts

## Purpose

Vitest spec that mounts the real `Wishlist.vue` view against a memory-history router built from the app's actual module route table, then asserts on the rendered DOM: link `href` vs. text, item-list cardinality, availability labels, move-to-cart visibility/enablement, and the empty state. It exists to pin the view's contract (what the browser sees) without exercising the network layer.

## Key elements

- **`mountWishlist(productIds, availabilities?)`** — Seeds the wishlist store (`items`) and the products store (`addProduct`) with known values, mocks `fetchWishlist` / `fetchProductsByIds`, then mounts `Wishlist` with router, Vuetify, and i18n plugins. Returns the test wrapper.
- **`signInAsShopper()`** — Sets a token, viewer identity, and tenant `update:Cart` ability on the session store so the move-to-cart button renders.
- **`router`** — Built with `createMemoryHistory` and the same `/:locale` → `collectModuleRoutes(enabledModules)` nesting as `app/router/index.ts`; used both for mounting and for a `router.resolve` assertion that the href maps to `ProductTarget`.
- **`beforeEach`** — Fresh Pinia, shopper sign-in, `loadLocale('en')`, then navigates to `/en/wishlist` and awaits `router.isReady()`.
- **`describe('the link on a saved item')`** — Asserts `href` contains the product ID and visible text is the human title; a second test resolves the href through the router and checks `name === 'ProductTarget'` with the correct params.
- **`describe('the item list')`** — Card count, fallback text for an unknown product ("No longer available"), aria-labels use the title, and the empty-state block.
- **`describe('the move-to-cart button and the cart key')`** — With no tenant abilities the button is absent while the item card remains.
- **`describe('each line wears its availability')`** — Parameterised cases for `out_of_stock` / `unavailable` (label shown, button still enabled) and `removed` (label shown, button disabled, remove button still enabled).

## Relationships

- **`src/modules/wishlist/views/Wishlist.vue`** — The component under test; imported and mounted directly.
- **`src/modules/wishlist/store.ts`** — `useWishlistStore` is seeded and its `fetchWishlist` spied on; the spec verifies the view reacts to `items` and per-line `availability`.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope so `collectModuleRoutes(enabledModules)` and the products barrel resolve to real registrations before the router is created.

## Notes

- `PRODUCT_ID` and `PRODUCT_TITLE` are intentionally different strings; any code path that builds a link from the title (or vice-versa) will fail rather than passing by coincidence.
- The router is the **real** app route table (via `collectModuleRoutes`), not a hand-written `products/:id` stub, so a route rename or param change in any enabled module is caught here.
- `fetchWishlist` and `fetchProductsByIds` are mocked to return already-seeded state, so `onMounted` resolves synchronously and the spec never touches a transport.
- The second item in the multi-card test uses an ID that is **not** registered in the products store, exercising the "unknown product" fallback text rather than a real product.
