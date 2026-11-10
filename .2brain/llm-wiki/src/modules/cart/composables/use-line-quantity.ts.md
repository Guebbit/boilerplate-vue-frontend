---
source: src/modules/cart/composables/use-line-quantity.ts
sha256: 6f6172494cebd548b5f67c2f59d3ea920904bcddfc93d187b30467844af1adc9
signature: 7844210c8bb1f3bdc259418b666e0c8544b324d65d7afa7b73fdbc7edeae16db
generated_at: 2026-11-10T03:56:23.935703+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/composables/use-line-quantity.ts

## Purpose

A Vue composable that decouples the visitor's quantity-stepper clicks from the API round-trip. It accumulates rapid clicks per product into a single debounced request while immediately reflecting each click locally, so the UI never shows a stale server value and the server never receives out-of-order quantities.

## Key elements

- **`useLineQuantity(update, onError, delayMs = 400)`** — single exported factory. Returns the object the view binds to:
  - **`quantityOf(productId, stored)`** — resolves what the line should display: the visitor's pending step if one is outstanding, otherwise the store's value.
  - **`stepQuantity(productId, stored, step)`** — moves one line by `+1`/`−1`; writes the new number into `pending` and kicks that product's debounced sender.
  - **`forget(productId)`** — cancels the product's timer and drops its pending entry. Called before line removal to prevent a queued step from resurrecting the line.
  - **`forgetAll()`** — cancels every timer and clears `pending`. Used by "Clear cart".
  - **`flushPending()`** — fires all outstanding debounced sends immediately (unmount path). Does **not** await the requests.
  - **`sendPendingKeepalive(send)`** — delivers every pending step through a caller-supplied `send` callback (must survive the page, e.g. a keepalive request) and discards timers. Used on `pagehide`.
  - **`settle()`** — flushes all sends **and** awaits every in-flight request. Rejects if any one failed. Used by checkout to guarantee the server has the final quantity before the cart is emptied.

- **`senders`** (non-reactive `Map<string, DebouncedFn>`) — one lodash-es debounced closure per product, created lazily on first step and kept for the page's lifetime.
- **`pending`** (`ref<Partial<Record<string, number>>>`) — the visitor's last stepped quantity per product, visible to `quantityOf` and consumed by each sender.
- **`inFlight`** (non-reactive `Map<string, Promise<boolean>>`) — tracks the live request per product so `settle()` can await it; entries are removed in `.finally` only if not superseded by a newer request.

## Relationships

- **`src/modules/cart/domain/index.ts`** (→ `quantity.ts`) — provides `steppedQuantity`, the pure clamp/validation function applied to each step.
- **`src/modules/cart/components/SignedInCart.vue`** — primary consumer; injects the store's `updateCartItem` as `update` and its toast handler as `onError`, then binds the returned API to the stepper UI.
- **`src/modules/cart/tests/use-line-quantity.spec.ts`** — unit-tests the composable's debounce, pending, settle, and keepalive behaviors.

## Notes

- `senders` and `inFlight` are deliberately **not** reactive refs; making them so would trigger re-renders on every timer creation.
- The `.finally` block in each sender guards against a race: it only clears `pending`/`inFlight` if the value hasn't been superseded by a newer click made while the request was in flight. Removing those guards reintroduces the "late step resurrects a removed line" bug.
- `settle()` is the only path that **awaits** the requests; `flushPending()` fires-and-forgets. Checkout must use `settle()`, not `flushPending()`.
- `delayMs` defaults to 400 ms but is parameterised so tests can use a shorter window.
- The composable is page-scoped (lives as long as the calling component); it is not a global store.
