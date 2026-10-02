---
source: src/modules/products/tests/products-list-view.spec.ts
sha256: 947f9ef9ce0721ef6b91e83cb0d1e4410946ace6b739bbd3e789d62883011922
generated_at: 2026-10-02T15:39:05.175834+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/products-list-view.spec.ts

## Purpose

Vitest component test for `ProductsList.vue`. Verifies that the catalogue page renders a storefront card grid for guests/read-only shoppers and a Vuetify data table (with row edit/delete actions) for staff, and that sorting is always delegated to the server via `searchProducts` rather than reordering rows client-side. Only the API client call is mocked; the real Pinia store, router, i18n, and Vuetify all run together.

## Key elements

- **`answerWith(...titles)`** – Configures the `searchProducts` mock to resolve a `SearchProductsResponse`-shaped payload with one product per title, wrapping it through `asStub` and `contractResponse` for schema fidelity.
- **`signInWith(tenant)`** – Populates the real `useSessionStore` with a fixed viewer and the given tenant ability pairs, driving the component's staff-vs-shopper branch.
- **`mountList()`** – Mounts `ProductsList` with the real router, Vuetify, i18n plugins and a stubbed `LayoutDefault`; tracks the wrapper in a module-level `mounted[]` array so `afterEach` can unmount everything.
- **`beforeEach`** – Clears `localStorage`/`sessionStorage` (session persistence leak), creates a fresh Pinia, resets all mocks, loads the `en` locale, and pushes `/en/products` on the memory router.
- **`describe('…grid for shoppers, table for staff')`** – Six cases covering guest grid, read-only grid, staff table, edit-only role, empty state, and the ID-filter column visibility.
- **`describe('…sorting on the server')`** – Three cases asserting that `SortSelect` changes and staff header clicks both write `filters.sort`, reset `pageCurrent` to 1, and pass the sort to `searchProducts`; also asserts no sort is sent until the user picks one.
- **`vi.mock('@api', …)`** – Partially mocks the API module: `searchProducts` and `getCatalogueFacets` are replaced with `vi.fn()`s while all other exports remain real.

## Relationships

- **`tests/support/unit/wire-modules.ts`** → `wireModulesIntoCore()` is called at module scope to register product-module routes and stores before any test runs.
- **`tests/support/unit/mounted-vm.ts`** → `emitOn()` is used to dispatch `update:modelValue` on the `SortSelect` child component.
- **`tests/support/stub.ts`** → `asStub()` wraps the resolved API payload so downstream code that narrows on the real return type still compiles.
- **`tests/support/unit/fixtures.ts`** → `aProduct()` fabricates individual product objects for the mocked response.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** → `contractResponse()` builds a schema-conformant envelope around the fixture items so the store and component receive a structurally valid `SearchProductsResponse`.
- **`tests/e2e/specs/journeys/cu18-the-wishlist-from-both-doors.cy.ts`** – Listed in the dependency graph but not imported here; shares the same "ability gates the UI" contract that this spec locks in at the unit level.

## Notes

- The `mounted[]` array and the manual `afterEach` unmount loop exist because the component is mounted inside `mountList` (an async helper) rather than directly in a test body; Vitest's automatic cleanup does not apply.
- `beforeEach` deliberately calls `router.push('/en/products')` and awaits `router.isReady()` so the real module-collected route is resolved before the component mounts—skipping this causes the view to render without the product route's context.
- The `getCatalogueFacets` mock always resolves empty categories/tags; tests do not exercise the facet sidebar.
- The file imports `SortSelect` only to target it with `findComponent` in the sort tests; it is not mounted in isolation.
