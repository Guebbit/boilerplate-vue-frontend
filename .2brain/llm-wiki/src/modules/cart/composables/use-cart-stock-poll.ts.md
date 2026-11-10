---
source: src/modules/cart/composables/use-cart-stock-poll.ts
sha256: 5e76c3135ec4da6a2c64d7d1e8bae0cb05452ab119ae54c180f2e89e1df2e2f1
signature: 4b0c0e89edc64582550c2484ee884f4530c674879909ee2d96c0132359db5f0c
generated_at: 2026-11-10T03:55:00.720688+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/composables/use-cart-stock-poll.ts

## Purpose

Opt-in composable that re-reads `GET /cart` on a fixed interval while the signed-in cart page is open, keeping each line's `availability` flag in sync with the shelf. It is a no-op unless `CART_STOCK_POLL_SECONDS` resolves to a valid positive number, and it permanently stops once the signed-in identity that opened the page is gone.

## Key elements

- **`useCartStockPoll()`** (default export) — Registers the poll for the lifetime of the caller's Vue scope. Resolves the interval from `runtimeValue` → `import.meta.env.VITE_CART_STOCK_POLL_SECONDS` via `stockPollIntervalMs`; returns early if the value is undefined.
- **`isTabVisible()`** (local) — Returns `document.visibilityState !== 'hidden'`.
- **`stillOwner`** (computed) — True while the current session viewer matches the `owner` captured at setup time.
- **`ended`** (ref, latched via `watch`) — Set to `true` the first time `stillOwner` goes false; never resets.
- **`visible`** (ref) — Mirrors the browser's `visibilitychange` events.
- **`tick()`** (local) — Calls the cart store's poll method; logs failures at `debug('http', …)` and relies on the next interval for retry.
- **`stop()`** (local) — Clears the `setInterval` handle.
- **Main `watch`** — Re-evaluates `stillOwner && !ended && visible` (immediate). Starts the interval when the combined condition becomes true; calls `tick()` once immediately on a transition from not-running to running. Stops the interval when the condition goes false.
- **`onScopeDispose`** cleanup — Clears the timer and removes the `visibilitychange` listener.

## Relationships

- **`src/modules/cart/domain/index.ts`** — Barrel that re-exports `stockPollIntervalMs` (implemented in `src/modules/cart/domain/stock-poll.ts`), which parses the raw seconds value into milliseconds or returns `undefined` for "off".
- **`src/modules/cart/store.ts`** — The composable calls the store's poll action on each tick; the store handles in-flight-write yielding and stale-response dropping.
- **`src/modules/cart/components/SignedInCart.vue`** — Expected caller; invokes `useCartStockPoll()` in its `setup` so the composable's lifetime matches the page's.
- **`src/infrastructure/utils/logger.ts`** — Imports `debug` to log tick failures without surfacing them to the user.
- **`src/modules/cart/tests/use-cart-stock-poll.spec.ts`** — Unit tests for the composable's start/stop/latch behavior.

## Notes

- The composable is a one-way latch: once `ended` flips to `true` (owner signs out or a different account takes the tab), no subsequent sign-in of the original user restarts polling. This is intentional.
- The first `tick()` fired by the `immediate` watch (page just loaded) effectively reads nothing new because the page already performed a fresh cart fetch; the first *meaningful* extra read happens on the interval tick or when the tab becomes visible again.
- `runtimeValue` is consulted before `import.meta.env`, so a deployment's `config.js` can override the build-time `.env` value without a rebuild.
- Failures are logged at `debug` level only; there is no user-facing error and no exponential backoff—the next interval simply retries.
