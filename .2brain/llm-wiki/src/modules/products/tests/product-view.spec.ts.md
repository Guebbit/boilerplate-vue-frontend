---
source: src/modules/products/tests/product-view.spec.ts
sha256: a5f3490c7762209008a5fa8dea93ce0b781aa01f2bd1ab38b240dc6893e4b718
signature: 97966a600438bdee86403dd2388bf15c8b6f600db59cc7afab596adba468cdea
generated_at: 2026-11-10T05:29:35.029565+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-view.spec.ts

## Purpose

Unit-test suite for the `ProductTarget.vue` detail page. It mounts the real component against a real memory-history router and exercises every product shape the API can return (out-of-stock, made-to-order, barebones, permission-gated, analytics-tracked) by seeding shapes directly into the store, bypassing the network fetch entirely.

## Key elements

- **`router`** — module-level `createRouter` over `createMemoryHistory` with routes from `collectModuleRoutes(enabledModules)`, mirroring the app's production router.
- **`SlotProbe`** — minimal component used to verify the `product-actions` slot renders contributed components and passes the product prop.
- **`mountProduct(product, contributions?)`** — central helper: stubs `watchProduct` with `noopWatchHandle`, seeds the product via `products.addProduct` / `selectedProductId`, then mounts `Product` with router, vuetify, i18n, and a `SLOTS_KEY` injection.
- **`signInWith(tenant)`** — sets `accessToken`, `viewer`, and abilities on `useSessionStore` to simulate an authenticated context.
- **`describe('the shelf')`** — asserts stock-related text: "Out of stock", "Low stock", "In stock", available-quantity display, and absence of withdrawal notice on ordinary products.
- **`describe('the product-actions slot')`** — confirms contributed slot components render and receive the product; nothing renders when no module contributes.
- **`describe('a barebones product')`** — verifies the empty-description fallback glyph (`—`) and that a real description replaces it.
- **`describe('the edit button')`** — verifies the `[data-test=go-to-edit]` button is hidden for shoppers/guests and shown only when `actions.update` is `true` (the folded server flag), not merely when the viewer holds `update:Product`.
- **`describe('the page view')`** — asserts `trackBrowsing` on `useAnalyticsConsentStore` fires exactly once with `{ event: 'product_viewed', productId }`.

## Relationships

- **`src/modules/products/store.ts`** — imports `useProductsStore`; stubs its `watchProduct` method and calls `addProduct` / sets `selectedProductId` to seed state without a fetch.
- **`src/modules/products/views/ProductTarget.vue`** — the component under test; imported as `Product` and mounted directly.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is invoked at module top-level to register module bindings before any test runs.
- **`tests/support/unit/watch-handle.ts`** — provides `noopWatchHandle`, the return value used to satisfy the `watchProduct` mock.
- **`tests/support/unit/fixtures.ts`** — provides `NO_PRODUCT_ACTIONS` (an all-false actions object) used as the default `actions` field in most test shapes.

## Notes

- `wireModulesIntoCore()` executes at **module scope** (once per file), not inside a `beforeEach`. Adding a new module to the enabled set changes the route graph for every test in this file.
- `SLOTS_KEY` is a Vue `InjectionKey` (a typed symbol); the test casts it to a plain `symbol` to satisfy `@vue/test-utils` mount `provide` typing.
- The router is **shared across all tests** in the file; `beforeEach` resets Pinia and pushes `/en/products/placeholder` so `router.isReady()` resolves, but the same `History` instance accumulates navigations.
- The "barebones product" section deliberately replaces an unused `ProductRole.minimal` value in the e2e suite; if the e2e `ProductRole` enum is referenced elsewhere, that is the only remaining coupling.
