# src/modules/cart/composables/use-line-quantity.ts

## Purpose

Provides a composable that debounces per-product cart quantity stepper clicks into a single trailing API call per line, while a local `pending` map keeps the UI responsive to the visitor's own clicks without waiting for the round trip. It replaces the previous pattern of firing one `updateCartItem` call per click, which caused out-of-order responses under slow connections.

## Key elements

- **`useLineQuantity(update, onError, delayMs?)`** — The sole export. Accepts the store's `updateCartItem` and the view's toast handler; returns `{ quantityOf, stepQuantity, forget, flushPending }`.
- **`pending`** — `ref<Partial<Record<string, number>>>` holding quantities the visitor has stepped to but the API hasn't confirmed yet.
- **`senders`** — A plain (non-reactive) `Map<string, DebouncedFunc>` of one lodash `debounce` instance per product, created lazily on first use.
- **`quantityOf(productId, stored)`** — Returns the pending value if one is outstanding, otherwise the store's number. This is what the view binds for display.
- **`stepQuantity(productId, stored, step)`** — Computes the next quantity via `steppedQuantity`, writes it to `pending`, and invokes that product's debounced sender.
- **`forget(productId)`** — Cancels the product's timer and clears its pending entry. Must be called before a line is removed.
- **`flushPending()`** — Calls `send.flush()` on every debounced sender. Intended for unmount cleanup.

## Relationships

No graph neighbors are recorded for this file. It imports `ref` from Vue, `debounce` from `lodash-es`, and `steppedQuantity` from `@/modules/cart/domain`.

## Notes

- **`senders` is deliberately a plain `Map`, not a `ref`.** Nothing renders from it; making it reactive would trigger re-renders on every line when a timer is first created.
- **`forget` must run before line removal.** A queued quantity for a deleted line would fire after removal and re-insert the line.
- **`flushPending` is FLUSH, not CANCEL.** A step the visitor made and then navigated away from is a change they expect to persist. Dropping it on unmount would defeat the composable's purpose.
- **`.finally()` guard:** the pending entry is cleared only if it still equals the value that was sent. A click made while the request was in flight leaves a newer number in `pending`; clearing unconditionally would discard it.
- **Per-product debouncing.** Two lines stepped in the same tick are independent changes and must not cancel each other's timers.
- `delayMs` defaults to **400 ms**.
