---
source: src/modules/products/tests/products-list-view.spec.ts
sha256: 3d5389acf8716ea71ffc6b20e4e3bb3a821d42164efd9dd96ab0a6c69fd0a9e4
signature: 3f0c3df5a7905db8a5641b9a8d801558fa732c57c6f914564e2d9644ed28a984
generated_at: 2026-11-10T05:30:01.843602+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/products-list-view.spec.ts

## Purpose

Vitest spec that exercises the real `ProductsList` view, real Pinia store, and real module-scoped router together, with only the HTTP client (`searchProducts`, `getCatalogFacets`) mocked. It verifies the role-driven presentation split (storefront grid vs. back-office table), server-side sort wiring, and the analytics "products_searched" relay, asserting on the outgoing request payload and the rendered DOM.

## Key elements

- **`wireModulesIntoCore()`** – called at module scope; registers the enabled modules' stores/components into the core toolkit so the real store and i18n pipeline are available.
- **`vi.mock('@api', …)`** – replaces `searchProducts` and `getCatalogFacets` with `vi.fn()` stubs; everything else from `@api` is preserved via `importOriginal`.
- **`answerWith(...titles)`** – shapes a `SearchProductsResponse` (one product per title) and feeds it to the mocked `searchProducts`.
- **`answerWithActions(actions)`** – feeds a single product whose `actions` object (update/delete/restore/hardDelete) is driven by the caller, letting tests assert which row buttons appear.
- **`signInWith(tenant)`** – populates the session store with a token, viewer, and tenant abilities so the page can branch on permissions.
- **`mountList()`** – mounts `ProductsList` with router, Vuetify, and i18n plugins; registers the wrapper in a `mounted` array for bulk unmount in `afterEach`.
- **Three `describe` blocks** – (1) grid-vs-table presentation and row-action visibility, (2) server-side sort (SortSelect emit, header click, no-sort default), (3) analytics relay (search submit reports, sort change does not).

## Relationships

- **`src/modules/products/views/ProductsList.vue`** – the component under test; mounted and asserted on directly.
- **`src/modules/products/store.ts`** – the real `useProductsStore` is used to read and write store state (sort filter, current page, search text) and to verify outgoing request parameters.
- **`tests/support/unit/wire-modules.ts`** – provides `wireModulesIntoCore`, called once at module top-level to hydrate the toolkit.
- **`tests/support/unit/mounted-vm.ts`** – provides `emitOn`, used to dispatch component events such as `update:modelValue` on `SortSelect`.
- **`tests/support/stub.ts`** – provides `asStub`, a type-level cast helper applied to mock return values.
- **`tests/support/unit/fixtures.ts`** – provides `aProduct`, the product factory used inside `answerWith`/`answerWithActions`.
- **`tests/support/unit/orval-fixture-schema.ts`** – provides `contractResponse`, which validates and stamps the mock payload against the OpenAPI schema before it is returned.

## Notes

- `localStorage.clear()` and `sessionStorage.clear()` in `beforeEach` are essential: the session store persists sign-in, and without clearing it a staff-ability case leaks into the next (guest) case.
- The `mounted` array pattern (push on mount, splice-and-unmount in `afterEach`) ensures every wrapper is torn down even when a test mounts a second instance (the by-id filter test mounts guest then staff).
- Row-action visibility is driven **solely** by the server-returned `actions` flags on each product, not by the viewer's abilities. The test "a row with every flag false offers nothing" makes this explicit: holding the tenant ability is necessary but not sufficient.
- The sort tests assert the **request** (sort array, page reset) rather than DOM reordering, consistent with the file's stated contract that the page never reorders locally.
