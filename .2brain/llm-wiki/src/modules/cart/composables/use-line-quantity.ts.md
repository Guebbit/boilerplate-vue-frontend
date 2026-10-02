---
source: src/modules/cart/composables/use-line-quantity.ts
sha256: ac6a484d477ed0f46decbb535d4273cd12b2a34a25f09f3bce82ed662046719f
generated_at: 2026-10-02T14:57:27.114782+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/composables/use-line-quantity.ts

## Purpose

Debounces per-product quantity-stepper clicks into a single trailing API call per line, while a local `pending` map immediately reflects the visitor's last click in the UI so the displayed number never lags behind the round trip. Exists to eliminate the race where multiple in-flight `updateCartItem` responses overwrite each other in the store.

## Key elements

- **`useLineQuantity(update, onError, delayMs?)`** — the sole export. Takes the store's update callback, an error reporter, and an optional debounce delay (default 400 ms). Returns the line-quantity API bound by the view.
- **`quantityOf(productId, stored)`** — resolves the display value: the visitor's pending number if one is outstanding, otherwise the stored value.
- **`stepQuantity(productId, stored, step)`** — increments/decrements by one, writes to `pending`, triggers the per-line debounced sender.
- **`forget(productId)`** — cancels the line's timer and clears its pending entry. Called before removing a line so a queued step can't resurrect it.
- **`forgetAll()`** — cancels all timers and wipes the pending map. For "Clear cart."
- **`flushPending()`** — fires all outstanding debounced sends immediately (used on unmount). Does **not** await the responses.
- **`sendPendingKeepalive(send)`** — cancels timers, hands each pending quantity to a caller-supplied keepalive transport, clears pending. For `pagehide`.
- **`settle()`** — flushes all sends **and** awaits every in-flight promise; rejects if any failed. For checkout, to guarantee the server has the final quantities before the cart is emptied.

Internal state: `pending` (reactive `ref` map), `senders` (plain `Map` of debounced functions, one per product), `inFlight` (plain `Map` of per-product promises).

## Relationships

- **`src/infrastructure/http/index.ts`** / **`src/infrastructure/utils/logger.ts`** — not imported directly here. The composable receives the HTTP call and error reporting through the `update` and `onError` parameters, which the calling view/store wire up from those infrastructure modules. This file knows nothing about their shape beyond the `(productId, quantity) → Promise<unknown>` and `(error) → void` signatures.
- **`@/modules/cart/domain`** — imports `steppedQuantity` for the arithmetic applied in `stepQuantity`.

## Notes

- `senders` and `inFlight` are intentionally **non-reactive** plain `Map`s; only `pending` is a `ref`. Making them reactive would trigger re-renders on every timer creation.
- The `finally` block in the debounced send only clears `pending`/`inFlight` entries if they still match the current request — a newer click made while the request was in flight must not be clobbered by the older request's cleanup.
- `settle()` **rejects** (throws) if any request failed; `onError` has already fired, so the rejection is purely a coordination signal for callers like checkout to abort.
- `flushPending` fires but does not await; `settle` does both. Using the wrong one is the documented FA34 bug (a step landing after the cart was cleared).
- Per-line debouncing: two lines stepped simultaneously get independent timers and must not cancel each other.
