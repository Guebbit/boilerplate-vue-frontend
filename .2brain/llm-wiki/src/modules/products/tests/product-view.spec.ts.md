---
source: src/modules/products/tests/product-view.spec.ts
sha256: a0108e079095fba9d86adb62a9908c18cd930c75ec8b1f3029b7d6be35d533cd
generated_at: 2026-10-17T01:33:17.347752+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-view.spec.ts

## Purpose

Unit-test suite for the `Product.vue` detail page. It mounts the real component against a real memory-history router (built the same way `app/router/index.ts` does) and exercises every product shape the API can return — stock states, slot contributions, barebones records, ability-gated UI, and analytics firing — by seeding the store directly rather than relying on a single fixture row.

## Key elements

- **`mountProduct(product, contributions?)`** – Core mount helper. Stubs `watchProduct` with `noopWatchHandle`, seeds the product into the store via `addProduct`/`selectedProductId`, then mounts `Product.vue` with the real router, Vuetify, i18n, and an optional `product-actions` slot payload.
- **`SlotProbe`** – Minimal component that renders `product.id` under `[data-test=slot-probe]`; used to verify slot contributions receive the correct product.
- **`signInWith(tenant)`** – Sets `useSessionStore` token, viewer, and tenant-specific abilities so the edit-button visibility tests can assert role-based rendering.
- **`router`** – A `createRouter` with `createMemoryHistory` whose routes are `[/:locale → RouterView → collectModuleRoutes(enabledModules)]`, mirroring production nesting.
- **`describe('the shelf')`** – Asserts stock-text rendering for out-of-stock, in-stock-with-count, flags-only, and low-stock shapes.
- **`describe('the product-actions slot')`** – Verifies contributed components render and receive the product; also confirms nothing renders when no module contributes.
- **`describe('a barebones product')`** – Covers the minimal `POST /products` shape (no description/categories) and the full-shape fallback.
- **`describe('the edit button')`** – Confirms `[data-test=go-to-edit]` is hidden for shoppers/guests and visible for staff with `update` on `Product`.
- **`describe('the page view')`** – Spies on `useAnalyticsConsentStore().trackBrowsing` and asserts exactly one call with `{ event: 'product_viewed', productId }`.

## Relationships

- **`src/modules/products/views/Product.vue`** – The component under test; mounted directly and queried via `data-test` attributes.
- **`src/modules/products/store.ts`** – Provides `useProductsStore`; its `watchProduct` is stubbed out and its state (`addProduct`, `selectedProductId`) is seeded per test.
- **`tests/support/unit/watch-handle.ts`** – Supplies `noopWatchHandle`, the return value for the `watchProduct` mock so no reactive watcher leaks.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module scope to register enabled modules into the kernel before `collectModuleRoutes` is invoked.
- **`contracts/rest/index.ts`** – The `Product` type imported from `@types` originates here; the shapes seeded in each test mirror the REST contract's optional/required field sets.

## Notes

- `SLOTS_KEY` is a Vue `InjectionKey` (a branded symbol). The mount `provide` option requires a plain `symbol`, so the code casts it: `[SLOTS_KEY as symbol]`.
- `watchProduct` is spied on *per mount* inside `mountProduct`, not in `beforeEach`, so each test gets a fresh spy and the store instance is fresh via `setActivePinia`.
- The "barebones product" describe block documents that it replaced an e2e `ProductRole.minimal` role that had no caller, removing the need for a browser-backed assertion of that shape.
- `beforeEach` awaits `loadLocale('en')` *then* `router.push` *then* `router.isReady()`, ensuring i18n messages are registered before the component renders.
