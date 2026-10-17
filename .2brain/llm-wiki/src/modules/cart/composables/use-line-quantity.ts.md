---
source: src/modules/cart/composables/use-line-quantity.ts
sha256: 70aba576e86738ab393e123973f33830cded05062908c16f024f8db9b016fe0e
generated_at: 2026-10-17T00:35:08.261581+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/composables/use-line-quantity.ts

## Purpose

A Vue composable that debounces per-product quantity stepper clicks into a single trailing API call, while a local `pending` map immediately reflects the visitor's last click in the UI. It exists to eliminate the race condition where rapid successive `updateCartItem` calls resolve out of order and the cart displays whichever response arrived last.

## Key elements

- **`useLineQuantity(update, onError, delayMs?)`** — The composable. Takes the store's `updateCartItem`, the view's error reporter, and an optional debounce delay (default 400 ms). Returns the public API below.
- **`pending`** — Reactive `Partial<Record<string, number>>`; holds each line's latest visitor-chosen quantity until the API acknowledges it.
- **`senders`** — Plain `Map<string, DebouncedFunc>`; one lodash `debounce` per product, created lazily, never reactive (avoids re-render on timer creation).
- **`inFlight`** — Plain `Map<string, Promise<boolean>>`; the currently outstanding request per line, used by `settle`.
- **`quantityOf(productId, stored)`** — Returns `pending[productId] ?? stored` so the UI shows the visitor's own click without waiting for the round trip.
- **`stepQuantity(productId, stored, step)`** — Computes the next value via `steppedQuantity`, writes it to `pending`, triggers the debounced send.
- **`forget(productId)`** — Cancels the line's timer and drops its pending entry. Call *before* removing a line so a queued step can't resurrect it.
- **`forgetAll()`** — Cancels every timer and clears `pending`. For "Clear cart."
- **`flushPending()`** — Calls `.flush()` on every debounced sender. For unmount: fires the requests but does **not** await them.
- **`sendPendingKeepalive(send)`** — Cancels all timers, delivers each outstanding step through a caller-supplied keepalive-safe `send`, clears `pending`. For `pagehide`.
- **`settle()`** — Flushes all senders **and** awaits every entry in `inFlight`; rejects if any request failed. For checkout, where the cart must be read/emptied only after the last step has landed.
- **`forgetPending(productId)`** (internal) — Removes one product's entry from `pending` without touching its timer.
- **`senderFor(productId)`** (internal) — Gets or creates the per-product debounced sender. The debounced callback reads `pending`, calls `update`, and in `.finally` clears `pending`/`inFlight` only if the value hasn't been superseded by a newer click.

## Relationships

- **`src/modules/cart/domain/index.ts`** → re-exports `steppedQuantity`, which this composable imports to clamp/step quantities. The composable delegates all quantity-boundary logic to the domain layer.
- **`src/modules/cart/domain/quantity.ts`** → source of `steppedQuantity`; the only domain function this file depends on.
- **`src/modules/cart/views/Cart.vue`** → Primary consumer. Calls `stepQuantity` from stepper buttons, binds display values through `quantityOf`, passes the store's `updateCartItem` as `update` and its own toast as `onError`. Invokes `forget` before line removal, `forgetAll` on clear, `flushPending`/`sendPendingKeepalive` on unmount/`pagehide`, and `settle` before checkout.
- **`src/modules/cart/tests/use-line-quantity.spec.ts`** → Unit/integration tests for the composable.
- **`src/infrastructure/http/index.ts`**, **`src/infrastructure/utils/logger.ts`** → Indirect neighbors. The composable does not import them; they are used by the store/view layer that supplies the `update` and `onError` callbacks.

## Notes

- `senders` and `inFlight` are deliberately plain `Map`s, not refs. Making them reactive would trigger a re-render of every cart line each time a timer is created.
- The `.finally()` guard (`pending.value[productId] === quantity` / `inFlight.get(productId) === request`) prevents a late-resolving older request from clobbering a newer one that was started while it was still in flight. Removing this check reintroduces the out-of-order bug the composable exists to fix.
- `flushPending` and `settle` are not interchangeable. `flushPending` fires requests and returns immediately; `settle` additionally awaits them and rejects on failure. Using `flushPending` where `settle` is needed (e.g., checkout) would let a step land on a cart the server has already emptied.
- `sendPendingKeepalive` requires the caller's `send` to use `fetch({ keepalive: true })` or equivalent; the composable itself has no way to signal that a request is still alive after the page navigates.
- The composable is stateful for the lifetime of the page (debounce timers, in-flight promises). It is not safe to create multiple instances for the same product line in parallel.
