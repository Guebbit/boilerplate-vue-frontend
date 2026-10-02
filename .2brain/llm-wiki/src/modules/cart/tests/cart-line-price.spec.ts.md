---
source: src/modules/cart/tests/cart-line-price.spec.ts
sha256: 3ed14c4abba42afd59bc71484b6a29f204f99c31c25147cd41eefade2cfdde1f
generated_at: 2026-10-02T15:00:04.812937+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/cart-line-price.spec.ts

## Purpose
Unit tests for the FA32b cart line-price behavior: verifying that the resolved product's unit price (× quantity) is rendered in the product's currency, and that nothing is rendered before the product lookup completes. Unlike `cart-view.spec.ts`, the product-read path runs for real here—only the `@api.searchProducts` endpoint is mocked—because the price under test is exactly what that lookup resolves.

## Key elements
- **`CART`** – A typed `CartResponse` fixture with one line (product `p1`, qty 3, GBP currency).
- **`vi.mock('@api', …)`** – Replaces `searchProducts` with a factory that returns a `contractResponse(schemas.SearchProductsResponse, …)` containing a single 9.99 GBP item.
- **`mountCart()`** – Mounts `Cart.vue` with router / vuetify / i18n plugins and stubs (`LayoutDefault`, `ShippingSelector`, `AddressPicker`, `PaymentMethodSelector`), then flushes promises.
- **Test 1** – Asserts `searchProducts` was called with `{ id: ['p1'], page: 1, pageSize: 1 }` and that `[data-test=cart-line-price]` contains both `£9.99` and `£29.97`.
- **Test 2** – Forces `searchProducts` to return a never-resolving promise; asserts the price element does not exist.

## Relationships
- **`tests/support/unit/wire-modules.ts`** – Provides `wireModulesIntoCore()`, called at module scope before tests run to register module routes into the kernel registry.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – Provides `contractResponse()`, used to build the `SearchProductsResponse` mock payload from the generated Orval schema.

## Notes
- The mock sets `pageSize: 1` to force the batched read to match the single product ID in the cart; the test explicitly asserts this call shape.
- `loadLocale('en')` is awaited in `beforeEach` before pushing the route, ensuring i18n is ready before the component mounts.
- The never-resolving promise in Test 2 is a deliberate pattern to keep the component in its "pending" state without needing a cancellation mechanism.
