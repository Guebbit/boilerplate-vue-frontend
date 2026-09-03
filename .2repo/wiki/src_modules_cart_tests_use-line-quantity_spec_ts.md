# src/modules/cart/tests/use-line-quantity.spec.ts

## Purpose

Test suite for the `useLineQuantity` composable's debounce behavior. Every assertion is written against the specific race it fixes (last-response-wins cart overwrite) rather than against debounce mechanics in the abstract, so the tests document *why* the debounce exists, not just *that* it exists.

## Key elements

- **`makeUpdate()`** — local factory that builds a mock `update(productId, quantity)` function returning deferred promises (never auto-resolving), plus a `calls` array and a `settleAll()` helper. This lets a test keep a request in flight for an arbitrary number of ticks.
- **`DELAY = 400`** — mirrors the composable's real debounce window; all timer advances reference this constant.
- **`beforeEach` / `afterEach`** — install and restore Vitest fake timers for every test.
- **`describe("the race it removes")`** — verifies a single debounced request carrying the final quantity, per-line independence, and that no request fires before the delay elapses.
- **`describe("what the visitor sees")`** — verifies optimistic quantity update on click, hand-back to the store after the API resolves, `onError` invocation + rollback on rejection, and the floor at quantity 1 (zero is a removal, a different call).
- **`describe("the ways a debounce loses data")`** — verifies a step made while a prior request is in flight is not swallowed, `flushPending()` sends immediately on unmount, and `forget(lineKey)` discards a queued step for a removed line.

## Relationships

- **`@/modules/cart/composables/use-line-quantity`** — the module under test; `useLineQuantity(update, onError, delay)` is the sole import.
- **`tests/unit/scripts/cypress-spec-globs.spec.ts`** — graph-adjacent test-infrastructure file; this spec file is one of the paths its glob patterns match or exclude. No runtime import in either direction.

## Notes

- All timers are fake; advancing time uses `vi.advanceTimersByTimeAsync` so pending microtasks (promise resolutions) are flushed in the correct order. Mixing sync `advanceTimersByTime` here would skip the `.then` callbacks that `makeUpdate().settleAll()` triggers.
- `makeUpdate().settleAll()` resolves promises *without* advancing the timer clock, then the test must call `advanceTimersByTimeAsync(0)` to let the composable's `.then` handler run. Omitting that zero-tick advance is a common source of "stale quantity" assertion failures.
- The floor test (`quantityOf('p1', 1)` stays 1 after a `-1` step) encodes a domain rule, not a debounce detail: quantity 0 is handled by a separate remove-line call.
