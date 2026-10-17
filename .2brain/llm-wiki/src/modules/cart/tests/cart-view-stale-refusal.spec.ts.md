---
source: src/modules/cart/tests/cart-view-stale-refusal.spec.ts
sha256: 0e5f1132fbb61c9b0461e19cd1b2a1a1aacd7ac95177177bb98bd566c6aeed79
generated_at: 2026-10-17T00:38:39.006088+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/cart-view-stale-refusal.spec.ts

## Purpose

Vitest spec verifying the cart page's recovery behavior when a checkout attempt is refused with a "screen is out of date" signal. It asserts that `CART_EMPTY` and `IDEMPOTENCY_IN_FLIGHT` refusals trigger a fresh cart read (removing phantom items or waiting for an in-flight retry), and that a bare 500 is resolved by re-reading the cart to decide whether the order was written.

## Key elements

- **`openThenRefuse(serverNow)`** – Shared setup: mounts the cart page over a one-item basket, picks `pickup` shipping, then primes `getCart` (via `mockResolvedValue`, not `Once`) so every post-refusal read returns `serverNow`.
- **`describe('a refusal that says the screen is out of date')`** – Five test cases:
  - *CART_EMPTY*: cart item list goes to zero after the refusal.
  - *IDEMPOTENCY_IN_FLIGHT (never resolves)*: `checkout` is called `1 + IN_FLIGHT_RETRY_DELAYS_MS.length` times; cart items cleared.
  - *IDEMPOTENCY_IN_FLIGHT then success*: second call reuses the same `Idempotency-Key` header; router lands on the new order.
  - *Bare 500, cart empty*: router navigates to `OrdersList`.
  - *Bare 500, cart full*: stays on `Cart`; the next user-triggered attempt generates a **different** idempotency key.
- **`vi.mock('@api', …)`** – Partial mock preserving original exports while replacing `getCart`, `updateCartItemById`, `setCartShippingMethod`, and `checkout` with `vi.fn()`.
- **`beforeEach`** – Clears session, resets mocks, sets a default `setCartShippingMethod` implementation, activates a fresh Pinia, sets a session viewer stub, loads locale `en`, and navigates the router to `/en/cart`.

## Relationships

- **`src/modules/cart/store.ts`** – Imports `IN_FLIGHT_RETRY_DELAYS_MS` to compute how far to advance fake timers in the in-flight retry tests.
- **`tests/support/unit/cart-fixtures.ts`** – Provides `aCart` (build cart fixtures), `apiRejection` (builds a 409/500 rejection envelope), and `answered` (wraps a payload as an API success).
- **`tests/support/unit/fixtures.ts`** – Provides `anOrder` for the order-success assertion.
- **`tests/support/unit/mount-cart-page.ts`** – Provides `mountCartPage` (mounts the Vue cart component with router/store wiring) and the shared `router` instance for route assertions.
- **`tests/support/unit/wire-modules.ts`** – Calls `wireModulesIntoCore()` once at module load to register DI modules before any test runs.
- **`tests/support/stub.ts`** – `asStub` creates the minimal `SessionViewer` object for the session store.
- **`contracts/rest/index.ts`** – Source of the `getCart`, `setCartShippingMethod`, and `checkout` API signatures that the mock replaces and the type system validates.

## Notes

- Fake timers are scoped to `setTimeout` only (`{ toFake: ['setTimeout'] }`), so microtask queues and `flushPromises` still operate normally. `afterEach` calls `vi.useRealTimers()` to restore.
- The idempotency-key assertion in the "stays on cart" test relies on the *user* triggering a second click; the test does **not** test automatic retry after a 500 — the key simply changes because the attempt is considered over.
- `openThenRefuse` uses `mockResolvedValue` (persistent) rather than `mockResolvedValueOnce` for the post-refusal `getCart`, so any number of re-reads within the test all return the same `serverNow` payload.
