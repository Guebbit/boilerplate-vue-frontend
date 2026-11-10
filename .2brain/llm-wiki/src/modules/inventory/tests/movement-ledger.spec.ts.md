---
source: src/modules/inventory/tests/movement-ledger.spec.ts
sha256: a443f74979ca0a7b7d64b8c4a693eb7fa8d45f73b907b241782cbff9165ab047
signature: 72a1687342b4a42be8b08759276693753c43dda00769eb491c02a571c4a644c0
generated_at: 2026-11-10T04:34:04.922018+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/movement-ledger.spec.ts

## Purpose

Unit-test suite for the `MovementLedger` Vue component. It verifies how the ledger resolves product titles via a single batched `searchProducts` call, renders movement deltas and reason labels, restores filters/page from URL query params, and guards the sweep action against duplicate submissions.

## Key elements

- **`movement(id, productId)`** — factory returning a minimal `StockMovement` fixture (one-unit receipt by default); used by every test that needs ledger rows.
- **`batchedIdCalls()`** — inspects the `searchProducts` mock's call history and returns only the `id` arrays (i.e. the batched title lookups), ignoring the filter-picker's free-text search calls.
- **`memoryRouter()`** — builds a single-route router on `createMemoryHistory` so the component can read/write its filter/page query params without a real browser.
- **`mountLedger(rows, router?)`** — spies `inventory.fetchMovements` to return the given rows, then mounts `MovementLedger` with Vuetify, i18n, and the router as global plugins.
- **`beforeEach`** — fresh Pinia, resets and re-stubs `searchProducts` (resolves titles for any id except the literal `'gone'`), and loads the `en` locale.
- **`describe('MovementLedger product titles')`** — the core batch: one call for all missing ids, skips ids already in the products dictionary, sends no call when all are known, falls back to raw id when a product is missing or the request rejects.
- **`describe('MovementLedger URL state')`** — asserts deep-link query params (`movements-productId`, `movements-page`) are read on mount and passed to `fetchMovements`.
- **`describe('MovementLedger sweep')`** — verifies a double-click on the sweep button triggers `confirm` and `sweep` exactly once; requires session auth + `sweep/StockLevel` ability to be set.

## Relationships

- **`src/modules/inventory/components/MovementLedger.vue`** — the component under test; imported and mounted in every test.
- **`src/modules/inventory/store.ts`** — `useInventoryStore` is spied on for `fetchMovements` (to inject rows) and `sweep` (to count calls).
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope to register i18n and UI modules so the component renders correctly under Vitest.
- **`tests/support/stub.ts`** — `asStub` is used throughout to cast partial objects into typed fixtures (`StockMovement`, `searchProducts` return).
- **`tests/support/unit/fixtures.ts`** — provides `NO_PRODUCT_ACTIONS`, a shared constant for the `seedProducts` helper when seeding the products store.

## Notes

- `wireModulesIntoCore()` runs **once** at the top of the module (not in `beforeEach`); it registers i18n/Vuetify into the Vitest app context.
- The `searchProducts` mock deliberately **filters out** the id `'gone'` from its results to simulate a product that no longer exists, letting tests assert the raw-id fallback.
- The batched-call assertion (`batchedIdCalls`) excludes calls where `body.id` is `undefined` (the filter-picker's free-text search), so only the ledger's title-resolution requests are counted.
- The sweep test must set `session.accessToken`, `session.viewer`, and `setAbilities` **before** clicking; omitting any of these will cause the button to be disabled or the call to be rejected.
