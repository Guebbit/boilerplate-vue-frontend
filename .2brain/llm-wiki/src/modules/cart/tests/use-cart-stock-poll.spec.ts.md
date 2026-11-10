---
source: src/modules/cart/tests/use-cart-stock-poll.spec.ts
sha256: dddeb85d408b596a4af1e51c406594e0f887f97f3b8f69a84cc16b6a52872770
signature: e7b3b9dd3a29e71a6e97be58f09da7b39247b4cb9f51893bf1c9448ac6e27b95
generated_at: 2026-11-10T04:13:08.948733+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart-stock-poll.spec.ts

## Purpose

Vitest spec for the `useCartStockPoll` composable. Drives the real Pinia cart store under fake timers to verify the full polling lifecycle: env-knob opt-in, auth gating, tab-visibility pause/resume, interaction with in-flight cart writes, and permanent teardown on logout / account switch / unmount.

## Key elements

- **`openPage()`** – Simulates the cart page's `setup()`: grabs `useCartStore()`, creates an `EffectScope`, and runs `useCartStockPoll` inside it. Returns the store.
- **`signedIn(id)`** – Sets a token on the session store and calls `signInAs(id)` to register a viewer, so `isAuth` is true.
- **`setVisibility(next)`** – Mutates the mocked `document.visibilityState`, dispatches `visibilitychange`, and awaits `nextTick()`.
- **`passSeconds(n)`** – Wraps `vi.advanceTimersByTimeAsync` for readable assertions.
- **`beforeEach`** – Installs fake timers, fresh Pinia, resets mocks, stubs `getCart` to resolve a fixture cart, and spies on `document.visibilityState`.
- **`afterEach`** – Stops the active effect scope (prevents timer/listener leaks) and restores real timers.
- **Describe blocks** – "the knob", "only for a signed-in person", "a hidden tab", "next to the shopper's own writes".
- **`@api` mock** – Every cart API function is stubbed via `vi.mock('@api', …)` so no real network calls occur.

## Relationships

- **`use-cart-stock-poll.ts`** – System under test; the composable run inside the `effectScope`.
- **`store.ts`** (`useCartStore`) – The Pinia store the poll reads from and writes into; assertions target its `cart` / `cartItems` state.
- **`cart-fixtures.ts`** (`aCart`) – Builds realistic cart payloads for `getCart` mock resolutions and write answers.
- **`cart-interleave.ts`** (`ACTIONS`, `issue`, `signInAs`) – Provides the "shopper's write" machinery (`issue(store, ACTIONS)`) and the sign-in helper used to simulate auth transitions.
- **`async-answers.ts`** (`gate`, `answered`) – Lets tests resolve a `getCart` promise at a controlled moment (races between poll and write).
- **`wire-modules.ts`** (`wireModulesIntoCore`) – Called once at module top to register stores/composables so they resolve inside the test's Pinia instance.

## Notes

- The knob is `VITE_CART_STOCK_POLL_SECONDS`; a runtime value on `window.__APP_CONFIG.CART_STOCK_POLL_SECONDS` overrides the build-time env. Valid values are positive whole-number strings; everything else (unset, `""`, `"0"`, negative, non-numeric, fractional) means **no** timer and **no** `visibilitychange` listener.
- The poll intentionally does **not** fire on page open — the page's own initial `GET /cart` covers that moment.
- A slow in-flight poll blocks the next tick (no piling); a rejected poll is swallowed and the next tick retries.
- `scope.stop()` in `afterEach` is the primary teardown; forgetting it would leak intervals and `visibilitychange` listeners into subsequent tests.
