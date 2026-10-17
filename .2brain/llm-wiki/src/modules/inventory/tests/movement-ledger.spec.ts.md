---
source: src/modules/inventory/tests/movement-ledger.spec.ts
sha256: 6679fddb3c1bae4fa12c3d2b7a6c89e641e4f9fb8d98d21c9058d7f2d5d6b967
generated_at: 2026-10-17T01:00:13.786197+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/movement-ledger.spec.ts

## Purpose

Unit tests for the `MovementLedger` Vue component. They verify three behaviours: that preorder movements render their signed delta and a human-readable reason word; that the component batch-fetches only the product titles it is missing (via one `POST /products/search` call) and falls back to raw ids on failure or unknown products; and that deep-link query parameters (`movements-productId`, `movements-page`) are read on mount and forwarded to the store.

## Key elements

- **`movement(id, productId)`** — builds a minimal `StockMovement` row (default: receipt, `onHandDelta: 1`).
- **`batchedIdCalls()`** — inspects the mocked `searchProducts` call log and returns only the `id` arrays that represent batched title lookups (filters out the filter-picker's free-text search).
- **`memoryRouter()`** — returns a `createRouter` instance on `createMemoryHistory` with a single `/` route, used to drive query-parameter tests.
- **`mountLedger(rows, router?)`** — spies `useInventoryStore().fetchMovements` to resolve the given rows, then mounts `MovementLedger` with Vuetify, i18n, and the router as global plugins.
- **`beforeEach`** — resets Pinia, mocks `searchProducts` (resolves titles for every id except `'gone'`), and loads the `en` locale.
- **`describe` blocks** — *preorder movements* (signed delta + reason label), *product titles* (batched fetch, deduplication, fallback on missing/failed), *URL state* (deep-link query params).

## Relationships

- **`src/modules/inventory/components/MovementLedger.vue`** — the SUT; imported and mounted directly.
- **`src/modules/inventory/store.ts`** — `useInventoryStore` is imported; `fetchMovements` is spied in `mountLedger` so the component receives deterministic rows without a network call.
- **`tests/support/stub.ts`** — `asStub` provides typed cast helpers for the inline object literals (movements, API responses).
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called once at module scope to register path aliases (`@api`, `@/modules/…`) before Vitest resolves the test's imports.
- **`tests/e2e/specs/journeys/cu18-the-wishlist-from-both-doors.cy.ts`** — no direct import or reference in this file; linked in the dependency graph only by shared concern (inventory ledger UI). No code-level interaction to document.

## Notes

- `wireModulesIntoCore()` runs at **module top level**, not inside `beforeEach`. Removing it (or moving it into a hook) will break path-alias resolution for the test file's static imports.
- The `searchProducts` mock deliberately drops id `'gone'` so one test can assert the "product not found → show raw id" path; other tests rely on every id being resolved.
- Two distinct mocking strategies coexist: the API layer (`@api`) is mocked, while the store's read method (`fetchMovements`) is spied. The store is never mocked wholesale, so other store logic (e.g. `movements` state) still runs.
- Query-parameter keys are namespaced with a `movements-` prefix (e.g. `movements-page`, `movements-productId`) to avoid collision with other components on the same route.
