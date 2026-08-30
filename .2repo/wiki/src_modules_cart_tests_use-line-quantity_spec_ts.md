# src/modules/cart/tests/use-line-quantity.spec.ts

## Purpose

Vitest spec for the `useLineQuantity` composable. It verifies that the 400 ms debounce correctly collapses rapid stepper clicks into a single API call while preserving optimistic UI, per-line independence, and data safety (in-flight steps, unmount flush, removed lines). Every assertion is written against the original race-condition bug (last-answered-wins) rather than against the debounce mechanism itself.

## Key elements

- **`makeUpdate()`** — local helper that returns a mock `update(productId, quantity)` function backed by deferred promises, plus a `calls` log and a `settleAll()` resolver. Lets tests leave a request in flight indefinitely.
- **`DELAY`** — constant (400) matching the debounce delay under test; used with `vi.advanceTimersByTimeAsync`.
- **`useLineQuantity(update, onError, delay)`** — the composable under test (imported from `@/modules/cart/composables/use-line-quantity`). Exposes `stepQuantity`, `quantityOf`, `flushPending`, and `forget`.
- **Three `describe` blocks:**
  - *"the race it removes"* — single request for the final quantity, per-line independence, no send before the timer elapses.
  - *"what the visitor sees"* — immediate optimistic increment, hand-back to store after API confirm, error rollback, floor-at-1 rule.
  - *"the ways a debounce loses data"* — click during in-flight request is not swallowed, `flushPending` on unmount sends the pending change, `forget` cancels a queued step.

## Relationships

- **`@/modules/cart/composables/use-line-quantity`** — the sole SUT; every test calls its exported `useLineQuantity` and exercises its return API.
- **`tests/unit/scripts/cypress-spec-globs.spec.ts`** — listed as a graph neighbor but no import, reference, or runtime interaction with this file is visible in the source.

## Notes

- Fake timers (`vi.useFakeTimers` / `vi.useRealTimers`) are mandatory in `beforeEach`/`afterEach`; the file's own header calls out that a real 400 ms wait would make the suite both slow and flaky.
- The `settleAll` pattern (resolving deferred promises + `advanceTimersByTimeAsync(0)`) is how tests simulate "the API has answered" without a real network round-trip.
- The composable is expected to be **per-line debounced**, not globally — the "keeps two lines independent" test explicitly guards against a shared-timer implementation.
- `quantityOf` is the read accessor; after an API rejection the local quantity is rolled back to the pre-step value, and after a successful settle the store's value becomes authoritative again.
