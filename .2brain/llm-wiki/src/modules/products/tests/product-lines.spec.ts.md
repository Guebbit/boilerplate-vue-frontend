---
source: src/modules/products/tests/product-lines.spec.ts
sha256: 3dfea9b372d49ea6c9012d37550e1801c8f74775a93f340a10b2a2df33148f18
generated_at: 2026-10-02T15:38:11.213804+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-lines.spec.ts

## Purpose

Vitest unit tests for the product-lines feature: the `fetchProductsByIds` store action (batched, id-only product lookup) and the `useProductLines` composable (mapping loaded product records to display titles). The file exists to lock in the batching contract, the "no longer available" fallback, and the guarantee that a raw id never reaches the UI.

## Key elements

- **`answerWithVisibleIds()`** – Mock implementation for `searchProducts`; returns one item per requested id, silently dropping any id that starts with `gone` (simulates products the caller can no longer see).
- **`renderNothing`** – Minimal render function (`() => null`) used by the probe component so `mount` has a valid render without a template.
- **`mountLines()`** – Mounts a throwaway component whose `setup` calls `useProductLines()`, returning the composable's public API (`titleOf`, `productOf`, `loadProducts`) for assertions.
- **`describe('fetchProductsByIds', …)`** – Four tests: single batched request with dedup, splitting past the 100-id contract cap, records landing in `store.products`, and no caching (second call re-hits the server).
- **`describe('useProductLines', …)`** – Three tests: title resolves after load, `gone-*` ids render as "No longer available", and an empty id list sends no request.

## Relationships

- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module top-level to inject the unit-test module wiring before any test runs.
- **`tests/support/stub.ts`** – `asStub` is used to satisfy the typed return of the mocked `searchProducts` call.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – `contractResponse(schemas.SearchProductsResponse, …)` shapes the mock payload against the generated schema so tests fail if the contract drifts.
- **`tests/e2e/specs/journeys/cu18-the-wishlist-from-both-doors.cy.ts`** – E2E journey that exercises the wishlist flow whose id-only lines ultimately call the same `fetchProductsByIds` / `useProductLines` path verified here; no code import between the two files.

## Notes

- The `gone` prefix is a **test convention only** (see `answerWithVisibleIds`); production code has no such filter. Any test needing a "not found" product should use that prefix.
- The 100-id cap is asserted as a **contract limit** of the `/products/search` endpoint, not a store-level constant. If the API changes its page-size cap, the "splits past the contract cap" test will break.
- `searchProducts` is mocked via `vi.mock('@api', …)` at module scope; no real HTTP or orval client is exercised. The `contractResponse` helper only validates shape.
- `wireModulesIntoCore()` runs **once at import time**, not inside `beforeEach`—ordering relative to `vi.mock` hoisting matters if new module-level side effects are added.
