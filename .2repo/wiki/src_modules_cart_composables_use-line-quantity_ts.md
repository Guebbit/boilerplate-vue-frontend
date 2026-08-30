# src/modules/cart/composables/use-line-quantity.ts

## Purpose

Debounces per-product cart quantity stepper clicks into a single trailing API call while keeping the displayed number responsive. It exists to eliminate the race condition where three rapid clicks on `+` fired three concurrent requests and the last-arriving response overwrote the correct total.

## Key elements

- **`useLineQuantity(update, onError, delayMs?)`** — The composable. Accepts the store's `updateCartItem`, an error handler (toast), and a debounce delay (default 400 ms). Returns the four-method API the view binds to.
- **`pending`** (`ref<Partial<Record<string, number>>>`) — In-memory map of quantities the visitor has stepped to that have not yet been confirmed by the API.
- **`senders`** (`Map<string, DebouncedFunc<() => void>>`) — One lodash `debounce` instance per product, created lazily on first use and retained for the page's lifetime. Deliberately a plain `Map` (not reactive) to avoid re-renders.
- **`quantityOf(productId, stored)`** — Returns `pending[productId]` if one exists, otherwise the store's value. This is what the template reads, so the UI reflects the click instantly.
- **`stepQuantity(productId, stored, step)`** — The action the stepper button calls. Computes `next` via `steppedQuantity`, writes it to `pending`, and triggers that product's debounced sender.
- **`forget(productId)`** — Cancels the product's debounced sender and drops its pending entry. Must be called before removing a line so a queued send cannot resurrect it.
- **`flushPending()`** — Calls `.flush()` on every sender. Intended for component unmount; sends all outstanding steps immediately rather than discarding them.
- **`forgetPending` / `senderFor`** — Internal helpers: `forgetPending` destructures the entry out of the reactive object; `senderFor` memoises the debounce closure per product.

## Notes

- **Supersede guard in `.finally`**: The pending entry is only cleared if it still equals the quantity that was sent. A click made while the request is in flight writes a newer number into `pending`; an unconditional clear would drop that newer value.
- **Per-product debouncing, not global**: Two lines stepped in the same instant produce two independent requests. A shared debounce would cancel one line's send when the other's timer fires.
- **`flushPending` is a flush, not a cancel**: The file's comments explicitly state that dropping a pending step on unmount would be "the debounce losing data, which is the one thing it must never do."
- **`senders` is not reactive**: A comment explains that making it a `ref` would trigger re-renders of every cart line each time a new timer is created, even though nothing renders from the map.
