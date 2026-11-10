---
source: tests/unit/infrastructure/http/single-flight.spec.ts
sha256: 62d948c3fed4221535e6280b7b3bc3a1ce719454b2e613f8ef9760bad52d4644
signature: 62d948c3fed4221535e6280b7b3bc3a1ce719454b2e613f8ef9760bad52d4644
generated_at: 2026-11-10T07:59:59.886664+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/single-flight.spec.ts

## Purpose
Unit tests for the `singleFlight` and `exclusiveRunner` helpers exported by `@/infrastructure/http/single-flight.ts`. They verify the deduplication contract that `refresh.ts` and `step-up.ts` rely on when a 401 triggers a shared token-recovery flow: concurrent callers must collapse into one in-flight promise, while sequential calls (success or failure) must always produce a fresh attempt.

## Key elements
- **`describe('singleFlight')`** — three test cases:
  - *Shares one in-flight promise between callers that overlap* — two concurrent invocations resolve to the same value and the underlying factory is called once.
  - *Starts a genuinely new attempt once the previous one has settled* — sequential calls each invoke the factory (call count = 2).
  - *Starts a new attempt after a failed one* — a rejected first call does not wedge the wrapper; the second call succeeds.
- **`describe('exclusiveRunner')`** — two test cases:
  - *Joins a second action started while the first runs* — the second caller receives the first action's result, not its own.
  - *Lets the next action start once the previous one settled, failed or not* — after a rejection the runner accepts a new action.

## Relationships
No dependency-graph neighbors are recorded for this file.

## Notes
- Tests are written with raw `Promise`/`.then` chains rather than `async/await`, matching the project's test-style convention.
- The "fresh attempt" guarantee is the critical behavioral contract: `singleFlight` must clear its in-flight slot on *both* resolve and reject paths. If this breaks, 401 recovery in `refresh.ts`/`step-up.ts` would silently drop retries after a failed refresh.
- `exclusiveRunner` is *not* a simple `singleFlight` alias — it discards the caller's own action when a join occurs, always returning the first runner's result.
