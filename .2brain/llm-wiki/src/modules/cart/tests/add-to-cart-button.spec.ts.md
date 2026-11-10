---
source: src/modules/cart/tests/add-to-cart-button.spec.ts
sha256: bccf9e424a94d0ea88a06d8df0e4a0274f50e2a058b164dbb6402c5d3335e9de
signature: ffe58a05d19932a48ffb48bb2fdebe1b45b9ad489c7d2eb0eb1bb130a0cee8a5
generated_at: 2026-11-10T04:00:29.752156+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/add-to-cart-button.spec.ts

## Purpose

Unit tests for `AddToCartButton.vue`, mounted in isolation with a `Product` prop. Verifies the button's disabled/enabled state and label text across shelf conditions (in-stock, out-of-stock, backorder, preorder, off-sale), guest-cart line management, and signed-in cart-addition (API payload, in-flight guard). The hosting product page is explicitly out of scope and lives in the `products` module's tests.

## Key elements

- **`mountButton(product)`** — mounts `AddToCartButton` with `vuetify` and `i18n` plugins; the standard way every test obtains a wrapper.
- **`signIn()`** — populates the session store with a token and viewer so the button isn't gated behind login.
- **`IN_STOCK`** / **`EMPTY_CART`** — default fixtures for the product shape and the cart response a stubbed write resolves with.
- **`vi.mock('@api')`** — wraps `addCartItem` with `vi.fn(actual.addCartItem)` so it calls through by default; only the in-flight test overrides it with a pending promise.
- **`vi.mock('@/modules/shop')`** — pins `backorderPromiseDays` to 30 for backorder-promise wording tests.
- **`describe('the shelf')`** — asserts `disabled` attribute and button label for each availability state.
- **`describe('a guest adding')`** — verifies guest-cart lines (localStorage-backed) grow on repeated clicks and respect `MAX_GUEST_LINES`.
- **`describe('adding')`** — verifies signed-in clicks send `(productId, 1)` to `addCartItem`, never read the cart to compute quantity, and that the button disables while a request is in flight.

## Relationships

- **`src/modules/cart/components/AddToCartButton.vue`** — the component under test; all assertions target its rendered output.
- **`src/modules/cart/store.ts`** — `useCartStore` is instantiated per test; tests spy on its `addCartItem` and `fetchCart` actions and inspect `guestLines` / `cart` state.
- **`src/modules/cart/domain/index.ts`** — provides `MAX_GUEST_LINES`, used to pre-fill the guest-cart limit test.
- **`tests/support/unit/fixtures.ts`** — supplies `NO_PRODUCT_ACTIONS`, the empty `actions` array on the product fixture.
- **`tests/support/unit/mounted-vm.ts`** — provides `nextRenderTick`, awaited after triggering the in-flight click to let Vue re-render the disabled state.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope to make cross-module imports (i18n, vuetify, session) resolve in the test environment.

## Notes

- **`@api` mock is pass-through by default.** `vi.fn(actual.addCartItem)` means most tests hit the real API function; only the in-flight test swaps in a pending promise. Don't assume `addCartItem` is stubbed globally.
- **Guest cart lives in `localStorage`, not Pinia.** `beforeEach` calls `localStorage.clear()` because a new Pinia instance doesn't wipe it.
- **In-flight guard requires a real pending promise.** `cart.loading` is TanStack-tracked state; only a genuinely unresolved request sets it. The test uses a promise that rejects on release to simulate a failed network call.
- **Quantity is always 1.** The "stale cart" test deliberately pre-seeds `cart.cart` with a 5-unit line to confirm the button never reads existing cart contents to compute a total — the server owns the arithmetic.
