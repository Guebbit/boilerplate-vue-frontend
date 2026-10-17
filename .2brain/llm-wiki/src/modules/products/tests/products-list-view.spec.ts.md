---
source: src/modules/products/tests/products-list-view.spec.ts
sha256: 278bffdc1cde3567ce00c633616a96e46f6afc5dbfecc756463c6ce6cfc5c125
generated_at: 2026-10-17T01:33:30.667788+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/products-list-view.spec.ts

## Purpose
Integration-level Vitest suite for `ProductsList.vue`. It mounts the real page (with real Pinia store, router, i18n, and Vuetify) and asserts the three behaviors the page owns: role-based presentation (storefront grid vs. staff table), server-side sorting (no client reorder), and the analytics event fired on search submission. Only the HTTP client (`searchProducts`) is mocked, so the store → search pipeline runs for real and assertions target the outgoing request.

## Key elements
- **`answerWith(...titles)`** — Configures the `searchProducts` mock to resolve a `SearchProductsResponse` with the given product titles (built via `aProduct` fixture + `contractResponse` schema).
- **`signInWith(abilities)`** — Sets up the session store with a token, viewer, and a precise ability list (e.g. `[['update','Product']]`) to drive the role-based view switch.
- **`mountList()`** — Mounts `ProductsList` with the shared router/Vuetify/i18n plugins, flushes promises so the initial search resolves, and registers the wrapper for teardown.
- **`router`** — A `createMemoryHistory` router whose sole route (`/:locale`) renders the collected module routes from `enabledModules`, giving the component a realistic route context.
- **`vi.mock('@api', …)`** — Partially mocks the API barrel: `searchProducts` becomes a `vi.fn()`, `getCatalogueFacets` resolves empty categories/tags; all other API exports pass through.
- **`afterEach`** — Unmounts every wrapper collected in `mounted` to avoid leaked Vue instances.
- **`beforeEach`** — Clears `localStorage`/`sessionStorage` (session persistence), resets Pinia, clears mocks, loads the `en` locale, and navigates to `/en/products`.

## Relationships
- **`src/modules/products/store.ts`** — Imports `useProductsStore`; tests assert its `filters.sort`, `pageCurrent`, and `filters.text` state after interactions.
- **`src/modules/products/views/ProductsList.vue`** — The component under test; mounted directly.
- **`tests/support/unit/wire-modules.ts`** — Calls `wireModulesIntoCore()` at module load so `collectModuleRoutes(enabledModules)` sees the products module registered.
- **`tests/support/unit/mounted-vm.ts`** — Provides `emitOn` to dispatch component events (e.g. `update:modelValue` on `SortSelect`).
- **`tests/support/stub.ts`** — Provides `asStub` to wrap the mock response in the expected runtime shape.
- **`tests/support/unit/fixtures.ts`** — Provides `aProduct` factory for realistic product objects.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — Provides `contractResponse` to validate/shape the mock payload against the Orval-generated `SearchProductsResponse` schema.
- **`tests/e2e/specs/journeys/cu18-the-wishlist-from-both-doors.cy.ts`** — Shares the same `aProduct`/`contractResponse` fixture utilities; no direct import from this file.

## Notes
- The file is intentionally an *integration* test: the store, toolkit search wiring, and page logic all execute. The single seam is the HTTP boundary (`searchProducts`). This keeps the suite fast while catching regressions in the store↔component contract.
- `wireModulesIntoCore()` runs at import time (module scope), before any test. It mutates the global module registry, so test-order isolation depends on Pinia/router reset in `beforeEach` rather than re-wiring.
- `getCatalogueFacets` is mocked to return empty categories/tags to prevent the page from making a second network call during mount.
- The staff vs. shopper distinction is driven entirely by the `abilities` array in the session store (`update`/`delete` on `Product` ⇒ staff table; `read` only or no session ⇒ grid). There is no separate "staff" boolean.
- Sorting tests assert the *outgoing request* (`searchProducts` last call argument) rather than DOM order, matching the "server sorts" contract described in the module doc comment.
