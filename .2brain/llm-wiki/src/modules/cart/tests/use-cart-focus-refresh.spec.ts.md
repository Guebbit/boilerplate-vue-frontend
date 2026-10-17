---
source: src/modules/cart/tests/use-cart-focus-refresh.spec.ts
sha256: 09b0d50af4b5013cfdf428e03d0a3494223654c74aba3783aef687100daf0a4b
generated_at: 2026-10-17T00:44:23.002812+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/use-cart-focus-refresh.spec.ts

## Purpose

Unit tests for the `useCartFocusRefresh` composable, verifying the cart page's refresh-on-return contract: a window focus or tab-becoming-visible triggers exactly one cart read, a tab going hidden triggers none, an in-flight write is never clobbered by a read, and all listeners are torn down when the page unmounts.

## Key elements

- **`openPage()`** — Simulates mounting the cart page: creates a Vue `EffectScope`, runs `useCartFocusRefresh` inside it, and returns the cart store. Stopped in `afterEach` to simulate unmount.
- **`setVisibility(state)`** — Mocks `document.visibilityState` via a getter spy and dispatches a `visibilitychange` event, mimicking real browser behavior.
- **`wireModulesIntoCore()`** — Called once at module scope to register cart modules in the test Pinia setup.
- **`vi.mock('@api', …)`** — Replaces every cart API function (`getCart`, `addCartItem`, `checkout`, etc.) with `vi.fn()` stubs so no network calls are made.
- **`describe('coming back to the cart page')`** — Five cases covering: focus triggers read, visible triggers read, hidden does not, in-flight write suppresses read, and scope stop removes all listeners.

## Relationships

- **`src/modules/cart/composables/use-cart-focus-refresh.ts`** — The SUT; its exported `useCartFocusRefresh` is the function under test.
- **`src/modules/cart/store.ts`** — Provides `useCartStore`, the Pinia store whose `cartItems` the tests assert against.
- **`tests/support/unit/cart-fixtures.ts`** — Supplies `aCart` (builds a typed cart fixture) and `answered` (wraps an API response) used to seed `getCart`.
- **`tests/support/unit/cart-interleave.ts`** — Supplies `ACTIONS.update` and `issue(store, action)`, a helper that enqueues a write and returns a controllable step (`step.answer`, `step.settled`) to simulate a concurrent in-flight mutation.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` registers the cart module into the shared test Pinia instance so `useCartStore` resolves correctly.

## Notes

- The test uses `vi.waitFor` (a polling-style await) rather than `await Promise` to let the async refresh settle; this is the Vitest idiom for asserting on eventually-consistent state.
- The "in-flight write" test clears the `getCart` mock *after* issuing the write and *before* dispatching focus, so the assertion isolates the suppression logic from the initial read.
- `scope.stop()` in `afterEach` is what proves cleanup: the "page is gone" test calls `scope.stop()` mid-test and then verifies no listener fires. Forgetting to stop the scope in other tests would leak listeners across cases.
