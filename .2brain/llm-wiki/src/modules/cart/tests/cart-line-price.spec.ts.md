---
source: src/modules/cart/tests/cart-line-price.spec.ts
sha256: f1adbec1382fb1973522fb2e7e3865631bd174919be1dee3314d7ad44dcb4901
generated_at: 2026-10-17T00:37:42.066241+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/cart-line-price.spec.ts

## Purpose

Unit test for the cart line-price display: it verifies that `Cart.vue` renders both the unit price and the line total (unit × quantity) in the product's resolved currency, and that nothing is rendered before the product lookup completes. Unlike `cart-view.spec.ts`, the product read runs for real here — only `searchProducts` is mocked — because the displayed price is exactly what that lookup returns.

## Key elements

- **`vi.mock('@api', …)`** — Partially mocks the `@api` module; `searchProducts` resolves (via `contractResponse`) with a single product `p1` at £9.99. All other `@api` exports pass through.
- **`CART: CartResponse`** — Fixture with one line (`p1`, qty 3) and a summary total of 29.97 GBP. Used to preload the store before mount.
- **`mountCart()`** — Helper that sets `cart.cart` to `CART`, spies on `cart.fetchCart`, mounts `Cart.vue` with router/vuetify/i18n plugins and stubs for `ShippingSelector`, `AddressPicker`, `PaymentMethodSelector`, then awaits `flushPromises`.
- **`beforeEach`** — Creates a fresh Pinia, clears mocks, loads the `en` locale, and pushes the router to `/en/cart`.
- **`describe('a cart line price')`** — Two tests:
  - Asserts `searchProducts` was called with `{ id: ['p1'], page: 1, pageSize: 1 }` and that `[data-test=cart-line-price]` contains both `£9.99` and `£29.97`.
  - Replaces `searchProducts` with a never-resolving promise and asserts the price element does not exist.

## Relationships

- **`src/modules/cart/views/Cart.vue`** — The component under test; mounted and queried directly.
- **`src/modules/cart/store.ts`** — Imports `useCartStore`; preloads `cart.cart` and spies on `fetchCart` to control state before mount.
- **`tests/support/unit/mount-cart-page.ts`** — Source of the `router` instance passed to the mount plugins.
- **`tests/support/unit/wire-modules.ts`** — Calls `wireModulesIntoCore()` at module load to register module providers before any test runs.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — Provides `contractResponse`, which builds a schema-valid `SearchProductsResponse` body for the mock.

## Notes

- The second test swaps `searchProducts` to `new Promise(() => undefined)` (a promise that never settles) to deterministically test the pre-resolution state.
- Component stubs (`ShippingSelector`, `AddressPicker`, `PaymentMethodSelector`) are inlined in both the `mountCart` helper and the second test's manual mount rather than shared via a constant — keep in sync if adding a new stub.
- The batched-read assertion (`pageSize: 1`) reflects the number of cart lines, not the endpoint default (10); changing the cart fixture changes the expected call arguments.
