---
source: src/modules/wishlist/tests/wishlist-view.spec.ts
sha256: 60f123a57f8732704f1631f35d60ec4a62fc6812e4274830fda5d99819cfeff0
signature: cad18da7f50ab7e5b48bf1b1897c6986b612ff9ff4f4f36786ca40cd51ff3d2e
generated_at: 2026-11-10T06:21:40.228573+00:00
model: ollama:qwen3.8:27b
---

# src/modules/wishlist/tests/wishlist-view.spec.ts

## Purpose

Vitest component spec for `Wishlist.vue`. Verifies that each saved wishlist line renders a product link whose **href** carries the product ID and whose **text** carries the product title; that the item list renders one card per line (or an empty state); and that each line's availability state is surfaced with the correct label and cart-action disabled state. The router is real (not stubbed) so link resolution is actually exercised.

## Key elements

- **`mountWishlist(productIds, availabilities?)`** – Seeds the wishlist store and products store with in-memory data, mocks `fetchWishlist` and product reads, then mounts `Wishlist.vue` with the real router, Vuetify, and i18n plugins. Returns the mounted wrapper.
- **`signInAsShopper()`** – Populates `useSessionStore` with a test token and a `customer`-role viewer so the page renders in an authenticated context.
- **`router`** (module-level) – Built with `createMemoryHistory` over `collectModuleRoutes(enabledModules)` under a `/:locale` parent, mirroring the production route table. Used both for mounting and for `router.resolve()` assertions.
- **`PRODUCT_ID` / `PRODUCT_TITLE`** – A ULID and the string `'Wireless Headphones'`; deliberately distinct so a bug that swaps title-for-id (or vice-versa) fails the link tests.
- **`describe('the link on a saved item')`** – Asserts `href` equals `/en/products/<id>` and text equals the title; a second test calls `router.resolve` on the href and expects the route name `ProductTarget` with matching params.
- **`describe('the item list')`** – Checks card count, unavailable-product label, `aria-label` content on action buttons, and the `.v-empty-state` element.
- **`describe('each line wears its availability')`** – Parametrised over `out_of_stock` / `unavailable` (label shown, cart button **not** disabled) and `removed` (label shown, cart button **disabled**, remove button still enabled).

## Relationships

- **`src/modules/wishlist/views/Wishlist.vue`** – The component under test; imported and mounted directly.
- **`src/modules/wishlist/store.ts`** – `useWishlistStore` is imported; its `items` array is seeded before mount and `fetchWishlist` is spied.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module scope so the kernel registry is populated before `collectModuleRoutes` reads it.
- **`tests/support/unit/fixtures.ts`** – Provides the `NO_PRODUCT_ACTIONS` constant used when seeding a product.
- `src/modules/cart/tests/guest-cart.property.spec.ts` appears as a graph neighbor but is not imported or referenced in this file.

## Notes

- `wireModulesIntoCore()` is a **side-effect import** executed at module load, not inside a `beforeEach`. Removing it breaks `collectModuleRoutes`.
- `loadLocale('en')` in `beforeEach` is load-bearing: without loaded dictionaries, `t()` returns its own key, so `aria-label` assertions comparing two identical keys would pass silently.
- The spec intentionally does **not** exercise the HTTP/transport layer; both `fetchWishlist` and product reads are resolved from pre-seeded state.
- `out_of_stock` and `unavailable` are treated identically by the cart-action logic (both remain enabled); only `removed` disables the "move to cart" button.
