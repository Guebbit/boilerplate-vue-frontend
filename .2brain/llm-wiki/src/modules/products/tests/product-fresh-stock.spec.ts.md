---
source: src/modules/products/tests/product-fresh-stock.spec.ts
sha256: f8ede8c16fc8c9b439205763086a7f20f71751fbe4f2c5a1b3826c660bcb53df
signature: 5e7dd95460948370fbbf25770cb73a4b927a48b457fcae21ebfffd55fe15502d
generated_at: 2026-11-10T05:28:50.865621+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-fresh-stock.spec.ts

## Purpose

Vitest spec that verifies the product page always refetches fresh stock from the server on mount, even when the Pinia store already holds a cached copy inside its five-minute TTL window. It confirms the page renders the cached value immediately and then swaps in the fresh one, and that calling `invalidateProductsCache` forces the next store read back to the server.

## Key elements

- **`serverHolds(available)`** — Builds a mock `getProductById` response (product `p1`, EUR, given `onHand`/`available` count) via `asStub`, returning a resolved promise.
- **`openPage()`** — Mounts the real `ProductTarget.vue` (id `p1`) with the app router, Vuetify, and i18n plugins.
- **`shownStock(wrapper)`** — Reads the text of `[data-test=product-stock]` for assertions.
- **`router`** (module-level) — A real app router built with `createMemoryHistory` and `collectModuleRoutes(enabledModules)`, scoped to the modules this suite enables.
- **`@api` mock** — Spreads the original module and replaces `getProductById` with a `vi.fn()`, leaving all other API functions untouched.
- **`describe('opening the product page')`** — Seeds a cache hit (stock 7), then asserts the page shows "7" before the fresh fetch resolves and swaps to "2".
- **`describe('invalidateProductsCache')`** — Caches once, invalidates, and asserts a second server call is made; also checks that the `queryClient` query cache still has entries under the `['products']` key.

## Relationships

- **`src/modules/products/store.ts`** — Source of `useProductsStore` and `invalidateProductsCache`; the tests drive the store's `fetchProduct` to seed cache state and call the invalidation function.
- **`src/modules/products/views/ProductTarget.vue`** — The component under test; mounted directly via `openPage()`.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module load to register all enabled modules with the kernel/registry so `collectModuleRoutes` can build the router.
- **`tests/support/stub.ts`** — `asStub` narrows partial mock objects to satisfy the full `getProductById` return type.
- **`tests/support/unit/fixtures.ts`** — Provides `NO_PRODUCT_ACTIONS`, used in the mock response to keep the product actionless.
- **`contracts/rest/index.ts`** — Resolved as the `@api` alias; the test imports and mocks `getProductById` from here.

## Notes

- `wireModulesIntoCore()` runs at **module top-level**, before any `beforeEach`, so all route registration and side-effects are already in place when the suite loads.
- The `beforeEach` navigates to `/en/products/p1` and awaits `router.isReady()` to ensure the route guard chain has settled before each test mounts the page.
- `loadLocale('en')` is awaited in `beforeEach` to guarantee i18n translations are available for the rendered product page.
- The `queryClient` (from `@/infrastructure/query-client.ts`) is asserted on in the invalidation test to confirm the QueryClient cache is still populated — a side-effect of the store's internal fetch mechanism.
