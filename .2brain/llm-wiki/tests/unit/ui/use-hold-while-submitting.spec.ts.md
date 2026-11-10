---
source: tests/unit/ui/use-hold-while-submitting.spec.ts
sha256: 9e6239126b22b24cb9facb977123161f603eb5bef53df6e57edf2e8c947a0244
signature: 9e6239126b22b24cb9facb977123161f603eb5bef53df6e57edf2e8c947a0244
generated_at: 2026-11-10T08:30:11.104446+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/use-hold-while-submitting.spec.ts

## Purpose

Unit tests for the `holdWhileSubmitting` composable. The composable ensures an edit form's hydration source does not move while a save is in flight, and that a rolled-back save (record reverts to its original value) is not treated as a change worth re-hydrating from. These tests pin that contract.

## Key elements

- **`describe('holdWhileSubmitting')`** — single suite containing four test cases:
  - *follows the record while no save is running* — with `busy = false`, the held ref tracks the record getter in real time.
  - *freezes while busy* — once `busy` flips to `true`, mutating the record (simulating an optimistic patch) does **not** change `held.value`.
  - *returns the same object after a rollback* — the critical identity test: after a busy cycle where the record is set and then restored to its original value, `held.value` is the **same object reference** (`toBe`, not `toEqual`), guaranteeing no re-hydration trigger.
  - *moves to the saved content once the save is over* — when `busy` transitions to `false`, the held ref picks up the record's current value.

## Notes

- The rollback test is the only one using `await nextTick()`. This is intentional: it verifies the composable resolves its held value **synchronously** on the busy→idle transition, but the test still flushes Vue's scheduler to be safe. The `toBe` (reference identity) assertion is the distinguishing factor — it catches implementations that create a new object on every getter call even when the value is unchanged.
- The getter passed to `holdWhileSubmitting` in most tests is `() => ({ ...record.value })`, i.e. it returns a **new object each call**. This makes the identity check in the rollback test meaningful: a naive implementation would return a new object and fail `toBe`.
- No module mocks or fixtures beyond inline refs; the file is fully self-contained.
