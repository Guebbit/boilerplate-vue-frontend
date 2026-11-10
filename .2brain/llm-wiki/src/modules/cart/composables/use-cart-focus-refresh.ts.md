---
source: src/modules/cart/composables/use-cart-focus-refresh.ts
sha256: 43d5ea29fad0771a9bcfa4b75428a40cc26dcf3722d95d9968a5a5acd8ce1630
signature: 06ff419e339b3448e941d9a4820a4d77ee3c0d72c55ce7e26c4486ed51c82871
generated_at: 2026-11-10T03:54:35.716824+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/composables/use-cart-focus-refresh.ts

## Purpose

Vue composable that re-reads the cart when the shopper returns to the page (window focus or tab visibility change). It catches out-of-band changes—another tab, wishlist edits, price/stock shifts—before the shopper clicks "Place order." It is event-driven, not polling: zero cost while the page is idle.

## Key elements

- **`useCartFocusRefresh()`** (exported, returns `void`) — the sole public API. Wires up listeners and registers cleanup for the caller's Vue scope.
- **`refresh`** (internal) — calls `cartStore.pollCart()` and swallows failures with a `debug` log; the on-screen cart is left as-is.
- **`onVisibilityChange`** (internal) — guards on `document.visibilityState !== 'hidden'` so only the *becoming-visible* transition triggers a read.
- **Event listeners** — `window 'focus'` → `refresh`; `document 'visibilitychange'` → `onVisibilityChange`. Both are removed via `onScopeDispose`.

## Relationships

- **`src/modules/cart/store.ts`** — calls `useCartStore().pollCart()`; the store owns the "yield to in-flight writes, drop stale responses" logic that makes a safe read possible.
- **`src/infrastructure/utils/logger.ts`** — imports `debug` to log (at `http` level) a failed background read.
- **`src/modules/cart/components/SignedInCart.vue`** — the expected caller: invokes the composable inside its `setup`, so the listeners live and die with that component.
- **`src/modules/cart/tests/use-cart-focus-refresh.spec.ts`** — unit tests for the composable.

## Notes

- The composable is designed to be called once per component scope; calling it twice in the same scope would register duplicate listeners.
- `visibilitychange` fires on *both* hide and show; the handler filters to the show direction only.
- There is no debounce or throttling—relaying between two tabs in quick succession can fire several `pollCart` calls. The store's internal stale-response guard (`pollCart`) is what keeps that safe.
- Failure is intentionally silent to the user; only a `debug`-level log is emitted.
