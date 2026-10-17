---
source: src/modules/cart/composables/use-cart-focus-refresh.ts
sha256: 43d5ea29fad0771a9bcfa4b75428a40cc26dcf3722d95d9968a5a5acd8ce1630
generated_at: 2026-10-17T00:34:22.798545+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/composables/use-cart-focus-refresh.ts

## Purpose

Event-driven cart re-read: when the browser window regains focus or a hidden tab becomes visible again, this composable triggers a single `pollCart()` call so the on-screen cart reflects any server-side changes (price/stock shifts, edits from another tab, wishlist actions). It is explicitly not a poller — it fires only on user-visible "return" events and costs nothing while the page sits idle.

## Key elements

- **`useCartFocusRefresh()`** (exported) — Vue composable. Registers `window.focus` and `document.visibilitychange` listeners for the lifetime of the calling setup scope, then removes them via `onScopeDispose`. Returns `void`.
- **`refresh`** (internal) — Calls `cartStore.pollCart()` and swallows any rejection with a `debug('http', …)` log; the existing on-screen cart is kept.
- **`onVisibilityChange`** (internal) — Guards on `document.visibilityState !== 'hidden'` before delegating to `refresh`, so the "hidden" transition is a no-op.

## Relationships

- **`src/modules/cart/store.ts`** — Imports `useCartStore`; the only interaction is calling `cartStore.pollCart()`. Concurrency rules (yield to in-flight writes, drop overtaken responses) live in the store, not here.
- **`src/infrastructure/utils/logger.ts`** — Imports `debug` to log a failed refresh at `'http'` level.
- **`src/modules/cart/views/Cart.vue`** — The consuming component; calls `useCartFocusRefresh()` inside its `setup` so listeners are scoped to the cart view's lifetime.
- **`src/modules/cart/tests/use-cart-focus-refresh.spec.ts`** — Unit-test spec for this composable.

## Notes

- Cleanup relies entirely on `onScopeDispose`; there is no manual `stop()` or reactive handle returned.
- A failed refresh is intentionally non-fatal: the debug message notes the on-screen cart is preserved. Do not escalate this to a user-visible error.
- The `visibilitychange` handler fires on *both* transitions (visible ↔ hidden); the `!== 'hidden'` check means it acts only on the "coming back" edge.
- No configuration, interval, or reactive dependency — the composable is inert until the browser dispatches one of the two events.
