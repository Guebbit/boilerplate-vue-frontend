---
source: src/modules/cart/tests/use-line-quantity.spec.ts
sha256: 748211d80538d67d523a2969259de335d41fb4c45e12d26c576b209e32767b25
generated_at: 2026-10-02T15:03:51.161589+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/use-line-quantity.spec.ts

## Purpose

Test suite for the `useLineQuantity` composable. It validates the debounce that prevents a race where rapid stepper clicks fire multiple cart-update requests and the store ends up with whichever response arrives last. Every assertion is framed against that failure mode ("one request, for the final number") rather than against the debounce mechanism in isolation, and it also covers the two ways a naive debounce silently loses data: swallowing a click made during an in-flight request and cancelling a pending step on unmount.

## Key elements

- **`makeUpdate()`** — local factory returning a mock `update(productId, quantity)` that records calls and returns a deferred (never-auto-resolving) promise, plus `settleAll()` and `resolvers` so tests can hold a request in flight indefinitely.
- **`DELAY` (400 ms)** — hardcoded to match the composable's debounce window; used with `vi.advanceTimersByTimeAsync`.
- **`useLineQuantity(update, onError, delay)`** (under test, from `@/modules/cart/composables/use-line-quantity`) — returns an object exposing `stepQuantity`, `quantityOf`, `flushPending`, `forget`, `forgetAll`, `settle()`, and `sendPendingKeepalive(send)`.
- **Five `describe` blocks** grouped by concern: the race it removes, visitor-visible feedback (immediate UI update, error rollback, quantity floor), data-loss failure modes of naive debouncing, FA34 checkout/clear coordination (`settle`, `forgetAll`), and page-leave keepalive (`sendPendingKeepalive`).
- **`beforeEach` / `afterEach`** — toggles `vi.useFakeTimers()` / `vi.useRealTimers()` so no test ever waits a real 400 ms.

## Relationships

- **`tests/unit/scripts/e2e/cypress-spec-globs.spec.ts`** — listed as a graph neighbor; no direct import or functional interaction is visible in this file's source. The relationship is likely at the test-glob / project-config level (the globs spec enumerates spec file paths) rather than a code-level dependency.

## Notes

- All tests rely on **fake timers**; the 400 ms delay is the subject under test, and real-time waiting would make the suite both slow and flaky (the exact reason debounces often go untested).
- The composable's public surface is inferred from usage: `stepQuantity(productId, quantity, delta)`, `quantityOf(productId, quantity)`, `flushPending()`, `forget(productId)`, `forgetAll()`, `settle(): Promise<void>`, `sendPendingKeepalive(send)`.
- `settle()` is the contract checkout/clear use: it flushes the pending step synchronously (the request leaves immediately) **and** awaits its resolution before the promise settles. `flushPending()` alone only fires the request without waiting.
- `forget(productId)` / `forgetAll()` must suppress any queued step so a removed line cannot be resurrected by a timer that fires after removal.
- The "floor" rule: `stepQuantity` will never drive a line's quantity below 1; zero is a removal and is a different API call entirely.
- `sendPendingKeepalive` is a one-shot fire-and-forget: after it hands outstanding steps to the keepalive sender, the internal timers are cancelled so the normal `update` path never fires for those steps.
