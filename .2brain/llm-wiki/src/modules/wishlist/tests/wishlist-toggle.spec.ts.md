---
source: src/modules/wishlist/tests/wishlist-toggle.spec.ts
sha256: cf78a8fa8948f89f6aa8e429130419e870e28a7a0504bdf9301accdc73c12bb3
signature: 57cb0c7ea39935d47beac034ce122d9389144c4cc436478317bbd8b3c7608d04
generated_at: 2026-11-10T06:21:19.018201+00:00
model: ollama:qwen3.8:27b
---

# src/modules/wishlist/tests/wishlist-toggle.spec.ts

## Purpose

Unit tests for the `WishlistToggle` component (the product-page "heart"). Verifies that the toggle is hidden for guests, saves/unsaves a product depending on current list state for an authenticated user, and surfaces an inline error when the write fails.

## Key elements

- **`PRODUCT`** – Constant `Product` fixture (`id: 'p1'`) passed as the sole prop to the component in every test.
- **`signIn()`** – Helper that populates the session store with a token and viewer, simulating an authenticated visitor.
- **`mountToggle(saved: string[])`** – Helper that seeds the wishlist store with the given product IDs, mocks `ensureWishlist` to avoid a real fetch, and mounts `WishlistToggle` with Vuetify and i18n plugins. Returns the store instance and the test-utils wrapper.
- **`describe('the wishlist heart')`** – Four test cases:
  - Guest sees no `[data-test=wishlist-toggle]` element.
  - Authenticated click on an unsaved product calls `addToWishlist('p1')`.
  - Authenticated click on a saved product calls `removeFromWishlist('p1')` and label reads "Saved".
  - A rejected `addToWishlist` causes `[data-test=wishlist-toggle-error]` to appear.

## Relationships

- **`src/modules/wishlist/components/WishlistToggle.vue`** – The component under test; mounted directly via `mount(WishlistToggle, …)`.
- **`src/modules/wishlist/store.ts`** – `useWishlistStore` is the Pinia store whose state is seeded and whose `addToWishlist` / `removeFromWishlist` / `ensureWishlist` actions are spied.
- **`tests/support/unit/fixtures.ts`** – Supplies the `NO_PRODUCT_ACTIONS` constant used in the `PRODUCT` fixture.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called once at module scope to register modules with the application core before any test runs.

## Notes

- `wireModulesIntoCore()` runs at **module top-level**, not inside `beforeEach`; it is assumed to be idempotent across test files in the same worker.
- `ensureWishlist` is always mocked with the comment "Decoration on the page, not under test – no transport to answer a real fetch here." Any change to the component that adds a real fetch during mount will break these tests unless the mock is updated.
- Each test creates a **fresh Pinia** via `setActivePinia(createPinia())` in `beforeEach`, so store state does not leak between cases.
- The guest test does **not** call `signIn()`; the absence of a token in the session store is what gates visibility.
