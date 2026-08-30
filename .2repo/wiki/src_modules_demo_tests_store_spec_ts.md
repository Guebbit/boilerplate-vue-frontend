# src/modules/demo/tests/store.spec.ts

## Purpose

Vitest spec that verifies the demo counter store's synchronous and delayed-increment behaviors. It exists because the store is the boilerplate's worked example (used in a Playground and by `exampleGuard`), so a broken counter would propagate confusion; the tests lock in the expected semantics before anyone copies the pattern.

## Key elements

- **`beforeEach` block** — resets to a fresh Pinia instance (`createPinia()` + `setActivePinia`) so each test runs in isolation.
- **`describe('counter store')`** — single suite containing the two tests below.
- **`it('starts at zero and doubles as it goes')`** — asserts initial state (`count === 0`, `doubleCount === 0`), calls `store.increment()`, then asserts `count === 1` and `doubleCount === 2`.
- **`it('increments after the delay, not before it')`** — enables `vi.useFakeTimers()`, calls `store.incrementDelayed()`, asserts `count` is still `0` before advancing time, then `vi.advanceTimersByTime(1000)` and awaits the returned promise to confirm `count === 1`. Restores real timers in the `.then` callback.

## Relationships

- **`src/modules/demo/store.ts`** — the sole import under test. Provides `useDemoStore` (a Pinia store) with the `count` state, `doubleCount` getter, `increment()` sync action, and `incrementDelayed()` async action whose 1 s delay is driven here by fake timers rather than a real wait.

## Notes

- The async test manually restores real timers inside the promise callback (`vi.useRealTimers()`) rather than in an `afterEach`; adding any new async test must follow the same pattern or it will leave fake timers active and leak into subsequent tests.
- `incrementDelayed()` returns a promise; the test explicitly `return`s it (or chains `.then`) so Vitest awaits completion. Forgetting the `return` would make the assertion race the timer advance.
- The 1 000 ms figure is hardcoded here and must match the delay value in `store.ts`; there is no shared constant imported between the two files.
