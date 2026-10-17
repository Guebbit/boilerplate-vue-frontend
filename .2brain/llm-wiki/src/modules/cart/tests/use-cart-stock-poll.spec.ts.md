---
source: src/modules/cart/tests/use-cart-stock-poll.spec.ts
sha256: e24853d1cac70d78cd649676791459939937a50961ac657caed293062552b87c
generated_at: 2026-10-17T00:44:40.945323+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/use-cart-stock-poll.spec.ts

## Purpose

Vitest spec for the `useCartStockPoll` composable. Exercises the composable against the **real** Pinia cart store (not a mock) while faking timers, tab visibility, and the `@api` layer. Covers five behavioral axes: the opt-in knob, auth gating, tab-visibility pause/resume, lifecycle teardown, and interaction with in-flight shopper writes.

## Key elements

- **`wireModulesIntoCore()`** — called at module top-level; wires stub modules into the app's core registry before any test runs.
- **`vi.mock('@api', …)`** — replaces every exported API function with a `vi.fn()`, so no real network calls are made.
- **`KNOB`** — string constant `'VITE_CART_STOCK_POLL_SECONDS'`; the env var the composable reads for its interval.
- **`scope: EffectScope | undefined`** — the effect scope the poll runs in, standing in for the cart page's `setup()`. Stopped in `afterEach`.
- **`signedIn(id)`** — sets `accessToken` on the session store and delegates to `signInAs`, returning a ticked promise.
- **`openPage()`** — calls `useCartStore()`, creates an `effectScope`, runs `useCartStockPoll` inside it, and returns the store.
- **`setVisibility(next)`** — updates the `visibility` variable, dispatches a `visibilitychange` event, and awaits `nextTick`.
- **`passSeconds(n)`** — wraps `vi.advanceTimersByTimeAsync(n * 1000)` so microtask queues (resolving `getCart` promises) settle.
- **`beforeEach`** — activates fake timers, clears `localStorage`, resets Pinia, resets all mocks, stubs `document.visibilityState` getter, and sets a default `getCart` resolution.
- **`afterEach`** — stops the scope, un-stubs env/globals, restores mocks, returns to real timers.
- **Five `describe` blocks:**
  - *the knob* — verifies no timer/listener for unset, empty, `0`, negative, non-numeric, or fractional values; correct interval for positive integers; `__APP_CONFIG` runtime override; no immediate read on mount; store receives availability data.
  - *only for a signed-in person* — no polling for guests; permanent stop on logout (no revival on next sign-in); stop on account switch; stop on scope teardown (including `removeEventListener` cleanup).
  - *a hidden tab* — pauses while hidden; re-reads once on re-visibility then resumes interval; no polling at all if opened hidden; no double-read on repeated `visible` events.
  - *next to the shopper's own writes* — skips a tick while a write is in-flight; keeps the write's answer over a stale poll response; does not stack a second read on a hung one; survives a rejected read and retries next tick.

## Relationships

- **`src/modules/cart/composables/use-cart-stock-poll.ts`** — the system under test; `useCartStockPoll` is the composable under observation in every case.
- **`src/modules/cart/store.ts`** — `useCartStore` is used as the **real** store; tests assert on its `cartItems`, `cart`, and `availability` fields.
- **`tests/support/unit/cart-fixtures.ts`** — provides `aCart` (cart shape factory), `gate` (a deferred-promise helper for simulating slow responses), `answered` (wraps a fixture into the API response shape), and the `Answer` type.
- **`tests/support/unit/cart-interleave.ts`** — provides `ACTIONS` (enum of shopper write actions), `issue` (starts a write against the store, returning a controllable handle), and `signInAs` (drives the session store's sign-in flow).
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore` registers mock/stub module bindings so the composable's internal imports resolve in the test environment.

## Notes

- The test **does not mock the cart store**; it uses a fresh `createPinia()` per case and drives the real store. This is intentional—the spec is about the composable's orchestration of reads, not the store's internals.
- `document.visibilityState` is mocked via a **getter spy** (`vi.spyOn(document, 'visibilityState', 'get')`), and `visibilitychange` events are dispatched manually. The `visibility` local variable is the single source of truth the getter returns.
- `vi.advanceTimersByTimeAsync` (not the synchronous variant) is used throughout because each poll tick produces a `getCart` promise that must resolve before the next assertion.
- The `__APP_CONFIG` global (`vi.stubGlobal`) tests the composable's runtime-config override path, which takes precedence over the `VITE_` env var.
- The default `getCart` mock resolves to `aCart([['p1', 2]])`—a single line with quantity 2—established in `beforeEach` and overridden per-test where needed.
