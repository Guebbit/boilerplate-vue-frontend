---
source: src/modules/wishlist/tests/wishlist-toggle.spec.ts
sha256: e9302bf8c963c6bf9decdfc47a775220019385657d7051527ed9992688915d61
generated_at: 2026-10-17T01:55:53.140830+00:00
model: ollama:qwen3.8:27b
---

# src/modules/wishlist/tests/wishlist-toggle.spec.ts

## Purpose

Vitest component test for `WishlistToggle.vue` — the "heart" button rendered in a product page's `product-actions` slot. Verifies that the toggle is hidden for guests, dispatches the correct store action (add vs. remove) based on current list state, and surfaces an inline error when a write fails.

## Key elements

- **`PRODUCT`** — Minimal `Product` fixture (`p1`, "Widget", EUR) passed as the component's `product` prop.
- **`signIn()`** — Sets `useSessionStore` to an authenticated state (`accessToken`, `viewer`) so the toggle is rendered at all.
- **`mountToggle(saved: string[])`** — Seeds `useWishlistStore.items` with the given product ids, mocks `ensureWishlist`, then mounts `WishlistToggle` with Vuetify + i18n plugins. Returns `{ wishlist, wrapper }`.
- **`wireModulesIntoCore()`** — Called once at module scope (line-level) to register the DI container before any Pinia store is instantiated.
- **`describe('the wishlist heart')`** — Four cases: guest-invisibility, add-on-click, remove-on-click (asserts label becomes "Saved"), and error-state rendering (`[data-test=wishlist-toggle-error]`).

## Relationships

- **`src/modules/wishlist/components/WishlistToggle.vue`** — The component under test; mounted via `mount(WishlistToggle, …)`.
- **`src/modules/wishlist/store.ts`** — Provides `useWishlistStore`; the spec reads `.items` directly and spies on `ensureWishlist`, `addToWishlist`, `removeFromWishlist`.
- **`src/modules/cart/tests/guest-cart.property.spec.ts`** — Shares the same DI wiring and session-store pattern, but no direct import or symbol dependency exists in this file.
- **`tests/support/unit/wire-modules.ts`** — Imported solely for `wireModulesIntoCore()`, which registers module providers in the core DI container so Pinia stores resolve their dependencies.

## Notes

- `wireModulesIntoCore()` runs at **module top-level**, not inside `beforeEach`. Importing the spec without this line would cause store-injection failures.
- `ensureWishlist` is **always mocked** regardless of scenario; the inline comment marks it as page decoration, not behavior under test.
- The guest test still calls `mountToggle([])` (which mounts the component) and then asserts the toggle *element* is absent — the component itself renders a conditional no-op.
- Selectors use `data-test` attributes (`wishlist-toggle`, `wishlist-toggle-error`), not CSS classes or component structure.
- `loadLocale('en')` is awaited in `beforeEach` after `setActivePinia`; both must complete before any test mounts a component that reads i18n keys.
