---
source: src/modules/products/tests/product-lines.spec.ts
sha256: eb2b780abfc4023c6f12780ab9479b72df0b8454e293ffed4a44a21ff9efd633
generated_at: 2026-10-17T01:33:02.172877+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-lines.spec.ts

## Purpose

Vitest spec that verifies the product-lines contract for carts and wishlists: batched `POST /products/search` (one request, not one per line), records landing in the shared store the product page reads, and titles that are human-readable strings — never raw IDs. It also covers availability-label wording and preorder formatting. `@api` is mocked at the `searchProducts` boundary so no real HTTP occurs.

## Key elements

- **`answerWithVisibleIds()`** — Mock implementation for `searchProducts`; returns one product per requested ID, excluding IDs prefixed with `gone` (simulates products the shopper can no longer see).
- **`mountLines()`** — Mounts a throwaway component whose `setup` calls `useProductLines()`, returning the composable's public API. Used in place of a real view.
- **`describe('fetchProductsByIds')`** — Four tests on the store action: single batched call, splitting at the 100-ID contract cap, records stored under `store.products`, and re-fetching on repeat calls (price freshness).
- **`describe('useProductLines')`** — Tests for `titleOf`, `productOf`, `availabilityLabel` (including all five availability states plus preorder with/without date), `isRemoved`, and the no-op empty-list guard.

## Relationships

- **`src/modules/products/composables/use-product-lines.ts`** — The composable under test (`useProductLines`, `titleOf`, `productOf`, `availabilityLabel`, `isRemoved`, `loadProducts`).
- **`src/modules/products/store.ts`** — Provides `useProductsStore` and its `fetchProductsByIds` action, also under test.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` sets up DI/module registration so the store and composable resolve correctly in the test environment.
- **`tests/support/stub.ts`** — `asStub` wraps mock payloads to satisfy the runtime schema guard.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — `contractResponse` + `schemas.SearchProductsResponse` builds a shape that passes the generated API schema validator.
- **`tests/e2e/specs/journeys/cu18-the-wishlist-from-both-doors.cy.ts`** — Exercises the same cart/wishlist-lines feature end-to-end; this spec is the unit-level counterpart.

## Notes

- Duplicates in the input ID list (e.g. `['p1','p2','p1']`) are de-duplicated before the request; the test asserts the sent `id` array has length 2.
- The 100-ID cap is a **contract limit**, not a configurable constant — the test hard-codes the expected `[100, 50]` split.
- `loadLocale('en')` is awaited in `beforeEach` because i18n messages (availability labels) are async; forgetting this produces `undefined` labels.
- The `gone`-prefix convention is local to this mock; it does not represent a real API response shape.
