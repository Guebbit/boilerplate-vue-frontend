---
source: src/modules/cart/tests/cart-route-view.spec.ts
sha256: 130e8ef7bd38a8dee7420df76369de2a5caaef9113de254b62f34006fc997291
signature: c2bb5996f57858f64c84ae0027f78e5ce8115d7b15b6ee5ab8d06135ad9f89cc
generated_at: 2026-11-10T04:01:59.137446+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/cart-route-view.spec.ts

## Purpose

Verifies the single routing decision made by `Cart.vue`: render `GuestCart` for anonymous visitors and `SignedInCart` for authenticated ones. Both child components are stubbed out so the spec tests only *which* branch is chosen, not what each branch renders.

## Key elements

- **`vi.mock('../components/SignedInCart.vue')` / `vi.mock('../components/GuestCart.vue')`** — Replace the real components with minimal `<div data-test="…">` stubs, keeping the test isolated from their internal behavior.
- **`signIn()`** — Helper that populates the Pinia session store with an `accessToken` and a `viewer` object, simulating an authenticated user.
- **`beforeEach`** — Creates a fresh Pinia instance per test to prevent state leakage.
- **`describe('the cart route')`** — Three cases: guest sees `guest-cart-stub`, signed-in sees `signed-in-cart`, and a live swap from guest → signed-in after a sign-in call followed by `nextTick`.

## Relationships

- **`src/modules/cart/views/Cart.vue`** — The component under test; mounted directly via `mount(Cart)`. The spec asserts which child branch `Cart.vue` renders based on the session store's auth state.

## Notes

- The `signIn()` helper comments that `isAuth` requires **both** `accessToken` and `viewer` — setting only one will not flip the branch.
- The "swaps the screen" test relies on the store mutation being reactive through Vue's render cycle; the explicit `await nextTick()` is required because the assertion runs synchronously after `signIn()`.
- Both stubs use `data-test` attributes rather than class or tag selectors, so the real components' markup is irrelevant to these assertions.
