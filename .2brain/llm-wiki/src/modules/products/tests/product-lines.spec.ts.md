---
source: src/modules/products/tests/product-lines.spec.ts
sha256: e375eb9e5e8e38e0606222ba45a3086af412b5c755cb612eec8580ae1767718e
signature: 0f3676368796f4e2d59cead170fe1f53e800f469cd15b358ba6109d20fa2dbc7
generated_at: 2026-11-10T05:29:18.804343+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-lines.spec.ts

## Purpose

Unit tests for the two halves of the product-lines feature: the store's batched ID lookup (`fetchProductsByIds`) and the `useProductLines` composable that renders line titles, availability labels, and removed-product state for carts and wishlists. Ensures the batch request is correct, records land in the shared store, and no raw product ID is ever surfaced to the shopper.

## Key elements

- **`answerWithVisibleIds()`** — mock implementation for `searchProducts`; returns one product per requested id, silently dropping any id prefixed with `gone` to simulate a product the shopper can no longer see.
- **`renderNothing`** — no-op render function used so the probe component has a valid render slot without a template.
- **`mountLines()`** — mounts `useProductLines` inside a real `defineComponent` setup (with the i18n plugin) and returns the composable's public API; this is how every composable test executes it in a component context.
- **`describe('fetchProductsByIds')`** — covers single-batch dedup, the 100-id contract cap (splits 150 → [100, 50]), store-record persistence, and cache-busting (second call always re-fetches).
- **`describe('useProductLines')`** — covers `titleOf`, `productOf`, `isRemoved`, `loadProducts([])` no-op, and `availabilityLabel` for all five stock states plus preorder/backorder date formatting.
- **`vi.mock('@/modules/shop')`** — overrides `backorderPromiseDays` to a fixed `ref(30)` so the backorder fallback string ("ships within 30 days") is deterministic.

## Relationships

- **`src/modules/products/store.ts`** — primary SUT for the `fetchProductsByIds` tests; the test asserts the shape of the `searchProducts` call and that resulting records are written into the store's product dictionary that the product page reads.
- **`src/modules/products/composables/use-product-lines.ts`** — second SUT; every `useProductLines` call is made through `mountLines` inside a component setup.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope to register the products module with the core before any test runs.
- **`tests/support/stub.ts`** — `asStub` wraps the mock response so it is type-cast against the real return type of `searchProducts`.
- **`tests/support/unit/orval-fixture-schema.ts`** — `contractResponse` validates the fixture object against the generated `SearchProductsResponse` schema at runtime.
- **`tests/support/unit/fixtures.ts`** — provides `NO_PRODUCT_ACTIONS`, the canonical empty actions array used in every fixture product.
- **`tests/e2e/specs/journeys/cu18-the-wishlist-from-both-doors.cy.ts`** — e2e journey that exercises the same wishlist product-lines path end-to-end; this spec covers the unit-level contract.

## Notes

- **`gone` prefix convention**: any id in the mock that starts with `gone` is treated as "removed/invisible" by `answerWithVisibleIds`. When adding new test cases for removed products, use this prefix rather than inventing a separate mechanism.
- **Composable is always mounted**: `useProductLines` relies on Vue reactivity context, so it must be called inside a component `setup`. The `mountLines` helper exists for this; do not call the composable bare in a test.
- **`loadLocale('en')` is async**: `beforeEach` awaits it before any test runs; availability labels and the "No longer available" fallback depend on the loaded locale.
- **100-id cap is a contract assertion**: the test hard-codes the expected split `[100, 50]` from a 150-id input. If the API contract changes the page-size cap, this test and the `answerWithVisibleIds` mock both need updating.
