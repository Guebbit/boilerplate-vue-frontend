---
source: src/modules/cart/tests/cart-line-price.spec.ts
sha256: 4b200c83589b450207ffbd781b6cf4244d11fb6ed222d1dae4c6111c2d0885dc
signature: cabfc8276c9c8b3133ca7371beb0dffca9127230563cd76260a43b6dfb915332
generated_at: 2026-11-10T04:01:45.951551+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/cart-line-price.spec.ts

## Purpose
Verifies that `SignedInCart` renders both the unit price and the line total (unit × quantity) in the resolved product's currency, and renders nothing until the product lookup completes. Unlike the broader `cart-view.spec.ts`, the cart store's product-resolution logic runs for real here; only the `@api/searchProducts` network call is stubbed, so the price computation path is exercised end-to-end.

## Key elements
- **`CART`** — A `CartResponse` fixture with one line (product `p1`, qty 3, total £29.97) used to preload the store.
- **`vi.mock('@api', …)`** — Partial mock that replaces `searchProducts` with a resolved `contractResponse` for a single product (`p1`, £9.99 GBP) while preserving all other `@api` exports.
- **`mountCart()`** — Helper that seeds the Pinia cart store, spies `fetchCart`, mounts `SignedInCart` with router/Vuetify/i18n plugins and stubs for ShippingSelector / AddressPicker / PaymentMethodSelector, then awaits `flushPromises`.
- **`describe('a cart line price')`** — Two tests:
  - *shows the unit price and the line total once the product resolves* — asserts `searchProducts` was called with `{ id: ['p1'], page: 1, pageSize: 1 }` and that `[data-test=cart-line-price]` contains both `£9.99` and `£29.97`.
  - *shows nothing before the product has resolved* — makes `searchProducts` return a pending promise; asserts the price element does not exist.

## Relationships
- **`SignedInCart.vue`** — The component mounted and under test; the spec asserts on its rendered `[data-test=cart-line-price]` output.
- **`store.ts`** — `useCartStore` is imported to preload `cart` state and spy on `fetchCart`.
- **`mount-cart-page.ts`** — Supplies the `router` instance used in the mount global plugins and in `beforeEach` navigation.
- **`wire-modules.ts`** — `wireModulesIntoCore()` is called at module top-level to register DI bindings before any test runs.
- **`orval-fixture-schema.ts`** — `contractResponse` wraps the mock payload so it conforms to the generated `SearchProductsResponse` schema.
- **`fixtures.ts`** — Provides the `NO_PRODUCT_ACTIONS` constant used in the mock product's `actions` field.

## Notes
- The module doc block explicitly contrasts this file with `cart-view.spec.ts`: here the store's product-lookup code path executes (it calls the mocked `searchProducts`), whereas the view spec likely mocks the store layer entirely.
- `searchProducts` is expected to be called with `pageSize: 1`, not the endpoint default of 10 — the assertion documents that the cart's batched read sizes the page to the number of lines.
- The "pending promise" test does **not** use `vi.mock` reconfiguration; it reassigns the mock's return value on the already-mocked function, which is safe because the mock is set up at module level.
