---
source: src/modules/cart/tests/use-line-quantity.spec.ts
sha256: a71d60801013f98ec100084081a91996756879f5fabf3d02d04003da69146923
generated_at: 2026-10-17T00:45:05.121882+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/use-line-quantity.spec.ts

## Purpose

Vitest suite for the `useLineQuantity` composable. It verifies that the debounce protecting quantity-stepper API calls eliminates the original race (multiple in-flight requests where the last response wins) without introducing data loss, incorrect UI state, or broken checkout/unmount flows.

## Key elements

- **`makeUpdate()`** — local factory returning a `vi.fn` that pushes each call into a `calls` array and returns a deferred (never-auto-resolving) Promise. Provides `settleAll()` and a raw `resolvers` array so individual in-flight requests can be resolved selectively.
- **`DELAY = 400`** — the debounce window in milliseconds, passed to every `useLineQuantity` call.
- **`describe('useLineQuantity — the race it removes')`** — asserts a single request carrying the final quantity, per-line independence, and no send before the window closes.
- **`describe('useLineQuantity — what the visitor sees')`** — covers immediate local quantity update, store hand-back after the API settles, error reporting via the `onError` callback, and the floor of 1 (zero is a removal, not a step).
- **`describe('useLineQuantity — the ways a debounce loses data')`** — verifies clicks made while a request is in flight are not swallowed, `flushPending()` fires the pending step synchronously, and `forget()` prevents a queued step from resurrecting a removed line.
- **`describe('useLineQuantity — checkout and clear must not race a pending step')`** — exercises `settle()` (flush-then-await, immediate resolve when idle, rejection on failure) and `forgetAll()`.
- **`describe('useLineQuantity — a step still in its debounce when the page goes away')`** — tests `sendPendingKeepalive(send)`: sends each outstanding line once via the provided sender, suppresses the original timer, and is a no-op when nothing is pending.

## Relationships

- **`src/modules/cart/composables/use-line-quantity.ts`** — the sole SUT. The spec imports `useLineQuantity` and exercises every public method it exposes (`stepQuantity`, `quantityOf`, `flushPending`, `forget`, `forgetAll`, `settle`, `sendPendingKeepalive`).
- **`src/modules/cart/tests/guest-cart.property.spec.ts`** — sibling spec in the same test directory; no shared imports or helpers. Co-located for the cart module's test suite.
- **`tests/unit/scripts/e2e/cypress-spec-globs.spec.ts`** — referenced only by the dependency graph (likely a glob-validation script that enumerates spec files). No runtime interaction with this file.

## Notes

- **Fake timers are mandatory.** Every test calls `vi.useFakeTimers()` in `beforeEach` and restores real timers in `afterEach`. The 400 ms debounce window is the subject under test; real-time waits would make the suite both slow and flaky.
- **Assertions target the race, not the debounce.** The file header explicitly states each assertion is written against the *failure mode the debounce fixes* (e.g., "one request, for the final number"), not against debounce mechanics in isolation.
- **Deferred promises, not resolved mocks.** `makeUpdate` returns Promises that never resolve on their own. Tests must explicitly call `settleAll()` or individual `resolvers[i]()` to simulate the server responding, which lets them interleave in-flight state with subsequent user actions.
- **`settle()` vs `flushPending()`.** `flushPending` only fires the pending request synchronously; `settle` additionally awaits its resolution (or rejection). Tests distinguish these to guard against a regression where checkout would proceed before the API has acknowledged the change.
- **`sendPendingKeepalive` suppresses the timer.** After invoking it, advancing timers past `DELAY * 2` must *not* produce a second call to `update`. This is the guard against double-sending on page-hide.
