# src/modules/demo/tests/store.spec.ts

## Purpose

Vitest spec for the demo counter store (`useDemoStore`). It verifies that the synchronous `increment` action, the `doubleCount` getter, and the asynchronous `incrementDelayed` action all behave as documented. The tests exist because the store is a worked example shown in the Playground — a broken counter would mislead users, and the `exampleGuard` feature also increments this store to demonstrate guard access.

## Key elements

- **`beforeEach`** — resets the active Pinia instance with `setActivePinia(createPinia())` so each test starts from a clean state.
- **`describe('counter store')`** — the test suite containing both scenarios.
- **`it('starts at zero and doubles as it goes')`** — asserts initial `count === 0` and `doubleCount === 0`, calls `store.increment()`, then asserts `count === 1` and `doubleCount === 2`.
- **`it('increments after the delay, not before it')`** — enables `vi.useFakeTimers()`, calls `store.incrementDelayed()`, asserts `count` is still `0` before the timer fires, advances timers by 1000 ms, awaits the returned promise, asserts `count === 1`, then restores real timers.

## Relationships

- **`src/modules/demo/store.ts`** — the sole system under test. This spec imports `useDemoStore` from `../store` and exercises its state (`count`), getter (`doubleCount`), sync action (`increment`), and async action (`incrementDelayed`). No other module is imported for behavior.

## Notes

- The delayed test restores real timers *inside* the promise `.then()` callback, not in an `afterEach`. If new tests are added, remember to either restore timers in a `finally`/`afterEach` or the fake timers will leak.
- The 1000 ms delay is hardcoded in the test (`vi.advanceTimersByTime(1000)`); it must stay in sync with whatever constant `incrementDelayed` uses in the store.
- The store is deliberately kept simple (single number, one getter, two actions) because it doubles as a teaching example — do not add complexity without updating the Playground documentation that references it.
