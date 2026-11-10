---
source: src/modules/cart/tests/cart-view-shipping-radio.spec.ts
sha256: 9d9111794225643b0899179d5407c0a672ab69631e2bb7d8718af60487c5df6e
signature: 64fd04a1691f0ed11994d76ff10c34694eb010277c6eb17931afeb8398ea9622
generated_at: 2026-11-10T04:02:47.665160+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/cart-view-shipping-radio.spec.ts

## Purpose

Vitest spec for the cart page's shipping radio under concurrent async state. It verifies that the radio's selection and the displayed cost stay correct no matter the relative ordering of the opening `getCart` read and the shopper's `setCartShippingMethod` pick, and that a subsequent read reporting the method as unavailable deselects it.

## Key elements

- **`calledTimes(api, times)`** – local helper; uses `vi.waitFor` to assert a mocked API fn has been called exactly `times` times, giving tests a deterministic sync point.
- **`beforeEach` block** – clears session storage, resets mocks, sets a default `setCartShippingMethod` implementation (resolves with the cart holding the picked method), activates a fresh Pinia, stubs the session viewer, and navigates the router to `/en/cart`.
- **`vi.mock('@api', …)`** – spreads `importOriginal` so only `getCart`, `updateCartItemByProductId`, `setCartShippingMethod`, and `checkout` are replaced with `vi.fn()`; all other `@api` exports remain real.
- **Three `it` cases** (all under one `describe`):
  1. *opening read answers before the pick* – resolves `getCart` first, then the pick; asserts the pick's method survives.
  2. *opening read answers after the pick* – resolves the pick first, then a stale `getCart` (method `null`); asserts the total reflects the server-holding method's cost.
  3. *later read says the method is gone* – calls `page.cart.fetchCart()` with a response where the method is cleared; asserts the radio deselects.

## Relationships

- **`src/modules/cart/tests/cart-fixtures.ts`** – imports `aCart`, the builder used to construct cart payloads with items and an optional shipping method for every mock resolution.
- **`src/modules/cart/tests/mount-cart-page.ts`** – imports `mountCartPage` (mounts the cart component with Pinia/i18n and returns a test helper with `pickShipping`, `selectedShipping`, `wrapper`, `cart`) and `router` (used in `beforeEach` to navigate).
- **`tests/support/stub.ts`** – imports `asStub` to create the minimal `SessionViewer` object placed in the session store.
- **`tests/support/unit/async-answers.ts`** – imports `gate`, `answered`, and the `Answer` type; `gate` provides a manually-resolvable promise pair so tests can control exactly when each API call settles, enabling the race-condition ordering each case needs.
- **`tests/support/unit/wire-modules.ts`** – imports `wireModulesIntoCore`, called at module top-level to register the cart module in the application's module registry before any test runs.

## Notes

- The `gate`/`answered` pattern is the core mechanism: each test creates two independent gates (one per API call) and resolves them in a chosen order, making response interleaving deterministic.
- `wireModulesIntoCore()` runs once at import time, not inside `beforeEach`; if it ever needs resetting between tests it must be refactored.
- The default `setCartShippingMethod` mock in `beforeEach` uses `mockImplementation` (not `mockResolvedValueOnce`), so it persists across all three tests unless a test overrides it with `mockReturnValueOnce`.
