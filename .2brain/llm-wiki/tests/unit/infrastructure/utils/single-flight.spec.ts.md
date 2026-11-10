---
source: tests/unit/infrastructure/utils/single-flight.spec.ts
sha256: 2055cd10c2792a48ac0b7f7f6709b9c915a8dc0bf82fcb5b9ea6b50c59e3df77
signature: 30bb2289286e961c1f5296a8c29a8bc53305811520466825daf20cd0fc51f13a
generated_at: 2026-11-10T08:07:09.076292+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/utils/single-flight.spec.ts

## Purpose

Vitest unit tests for the `singleFlight` utility, verifying its core contract: while a call is in-flight, subsequent calls are dropped (returning `undefined`), and after settlement—whether success or failure—the guard releases so the next call proceeds.

## Key elements

- **`singleFlight`** (imported from `@/infrastructure/utils/single-flight.ts`) — the function under test; wraps an async action so concurrent invocations are coalesced.
- **`noop`** — module-level default for the `finish` resolver variable, used to satisfy TypeScript before the real resolver is assigned inside a test.
- **Test: "drops a call made while the first is unsettled"** — asserts a second call returns `undefined`, the first resolves with its own argument, and the underlying action is invoked exactly once.
- **Test: "lets the next call through once the first settled, even when it failed"** — asserts a rejected first call still releases the guard; a second call resolves normally.
- **Test: "frees the guard when the action had nothing to run"** — asserts that if the action returns `undefined` (no promise), the guard is immediately released and a subsequent call executes.

## Notes

- The `noop` constant exists purely to give `finish` an initial value so the variable is definitely assigned before the promise executor runs; it is never called in a meaningful way.
- The "undefined return" test covers a non-obvious edge case: `singleFlight` must treat a non-Promise return as an immediate settle, not leave the guard locked.
- Tests rely on `vi.fn` with manual `mockRejectedValueOnce` / `mockResolvedValueOnce` sequencing rather than a shared mock state, keeping each case independent.
