---
source: src/modules/cart/tests/use-line-quantity.spec.ts
sha256: 01a5165f3de40210e264d8cb8e5b52f9346a5877cd8e7bc0946374494c8305ac
signature: ec81953d7cb28bd720fb583010c33e1aec4c29693767488a2bd5d65d96c2ec72
generated_at: 2026-11-10T04:13:39.549803+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/use-line-quantity.spec.ts

## Purpose

Vitest suite for the `useLineQuantity` composable. Every test is written against the race the debounce was introduced to fix (three rapid clicks → three in-flight requests → last-write-wins) rather than against the debounce mechanism in isolation. The suite also pins down the two silent data-loss modes a naive debounce would introduce (swallowing a click made mid-flight, cancelling an unflushed step on unmount) and the checkout / page-leave contracts (`settle`, `sendPendingKeepalive`).

## Key elements

- **`makeUpdate()`** – Factory that returns `{ update, calls, settleAll, resolvers }`. `update` is a `vi.fn` whose return value is a *deferred* promise (resolved only when the test calls `settleAll()`), giving tests full control over when a request "lands."
- **`DELAY`** – `400`, the debounce window in ms, matched to the composable's configured delay.
- **`beforeEach` / `afterEach`** – Activate / restore `vi.useFakeTimers()` for the whole suite.
- **`describe('… the race it removes')`** – Verifies one coalesced request per line, per-line independence, and that no request fires before the window closes.
- **`describe('… what the visitor sees')`** – Checks immediate local quantity update on click, post-settle handback to the store, error reporting via `onError`, and the minimum-quantity floor (1).
- **`describe('… the ways a debounce loses data')`** – In-flight click is not swallowed; `flushPending()` fires immediately; `forget(line)` cancels a queued step so a removed line cannot resurrect.
- **`describe('… checkout and clear must not race…')`** – `settle()` flushes synchronously *and* awaits the in-flight promise; rejects on a failed send (while still delegating the toast to `onError`); correctly tracks the newest request per line even when an older one resolves first; `forgetAll()` cancels every line.
- **`describe('… the page goes away')`** – `sendPendingKeepalive(sender)` emits one call per pending line with the final quantity; does not double-send after the timer would have fired; no-op when nothing is pending.

## Relationships

- **`src/modules/cart/composables/use-line-quantity.ts`** – The sole SUT. Imported as `useLineQuantity(update, onError, delay)`; every assertion in this file exercises its public API (`stepQuantity`, `quantityOf`, `flushPending`, `settle`, `forget`, `forgetAll`, `sendPendingKeepalive`).
- **`src/modules/cart/tests/guest-cart.property.spec.ts`** – Sibling test in the same directory; exercises the same composable in a guest-cart property-based context (no shared state or imports visible from this file).

## Notes

- **`vi.advanceTimersByTimeAsync`** is used everywhere a promise resolution is expected inside the timer window (not the sync `advanceTimersByTime`), so microtask queues drain correctly.
- **`settle()` ≠ `flushPending()`**: `flushPending` fires the request and returns; `settle` fires it *and* awaits the response, rejecting if it fails. A test that only checks `flushPending` would miss the settle-awaits bug.
- **Deferred promises, not `mockResolvedValue`**: `makeUpdate()` stores raw resolvers so tests can settle requests out of order (e.g., resolving request A before request B to verify the `inFlight` map tracks the *newest* per line).
- **Composable constructor signature**: `(update, onError, delayMs)`. `onError` is the per-line failure callback; `settle`'s rejection is a separate signal for callers like checkout.
