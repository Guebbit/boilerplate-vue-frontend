---
source: src/modules/products/tests/product-fresh-stock.spec.ts
sha256: eb1bbc6be70ade345dc0d54db597e0b7fe01d0e2340d5aaaa6020fd76a616028
generated_at: 2026-10-17T01:32:49.570083+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-fresh-stock.spec.ts

## Purpose

Verifies the "fresh-on-open" contract of the product page: when a shopper navigates to a product that was recently read by the list (inside the store's five-minute cache window), the cached value renders immediately and a background refetch swaps in the current stock. Also confirms that `invalidateProductsCache` forces the next read back to the server. Runs against the real store and real page component, with only the HTTP boundary (`getProductById`) mocked.

## Key elements

- **`serverHolds(available: number)`** – Builds a resolved `Promise` shaped like the `getProductById` response (id `p1`, EUR price, stock fields) via `asStub`, so the mock can vary `available` between calls.
- **`openPage()`** – Mounts the real `Product.vue` (prop `id: 'p1'`) with router, Vuetify, and i18n plugins; returns the `VueWrapper`.
- **`shownStock(wrapper)`** – Reads the text of `[data-test=product-stock]` for assertions.
- **`vi.mock('@api', …)`** – Partial mock: spreads the original module, then replaces only `getProductById` with a `vi.fn`.
- **Router (module scope)** – A `createMemoryHistory` router whose routes come from `collectModuleRoutes(enabledModules)`; used so `router.push('/en/products/p1')` resolves before the test body runs.
- **`describe('opening the product page')`** – Seeds a cache hit (`available: 7`) via `useProductsStore().fetchProduct`, then opens the page with a different mock (`available: 2`); asserts the UI shows `7` synchronously and `2` after `flushPromises`.
- **`describe('invalidateProductsCache')`** – Caches `p1`, calls `invalidateProductsCache()`, fetches again; asserts a second HTTP call and that the TanStack Query cache still holds a `['products']` entry.

## Relationships

- **`contracts/rest/index.ts`** – Provides the return type that `serverHolds` types against via `Awaited<ReturnType<typeof getProductById>>` and the shape wrapped by `asStub`.
- **`src/modules/products/store.ts`** – Source of `useProductsStore` and `invalidateProductsCache`; the test drives both to set up cache state and verify invalidation.
- **`src/modules/products/views/Product.vue`** – The component under test; mounted directly and inspected via its stock DOM node.
- **`tests/support/stub.ts`** – Exports `asStub`, used to construct the mocked API response payload.
- **`tests/support/unit/wire-modules.ts`** – Exports `wireModulesIntoCore`, called once at module load to register test-scoped modules with the kernel before routes are collected.

## Notes

- The `@api` mock is **partial** (`...await importOriginal()`), so other exports from that module remain real; only `getProductById` is intercepted.
- `beforeEach` calls `router.isReady()` before each test; assertions that depend on route resolution (e.g., the page fetching on mount) rely on this completed navigation.
- The invalidation test inspects `queryClient.getQueryCache()` directly, coupling the assertion to the TanStack Query internals rather than a pure store-level check.
- `wireModulesIntoCore()` runs at top level (once per test file), not inside `beforeEach`; it mutates shared kernel state for the duration of the Vitest worker.
