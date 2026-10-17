---
source: src/modules/locales/tests/deactivate-then-delete.spec.ts
sha256: c634fd6db1eb553c8681ed9b0700430b563aece492dcaaff88f6b67fee6f404b
generated_at: 2026-10-17T01:05:00.383466+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/tests/deactivate-then-delete.spec.ts

## Purpose

Vitest suite that verifies the behavior of `deactivateThenDelete`, covering the happy-path ordering (deactivate → delete), the no-op path for already-inactive rows, and the critical recovery path where a failed delete after a successful deactivation must reactivate the row without swallowing the original error.

## Key elements

- **`describe('deactivateThenDelete')`** – single suite containing five `it` blocks, each supplying inline `vi.fn()` mocks for the three async callbacks (`deactivate`, `remove`, `reactivate`) rather than a shared fixture.
- **Test 1** – inactive row: asserts `deactivate` and `reactivate` are never called; only `remove` fires.
- **Test 2** – active row: records call order in a shared array and asserts `['deactivate', 'remove']`.
- **Test 3 (regression)** – active row, `remove` rejects: asserts the promise rejects with the *original* delete error **and** that `reactivate` was called.
- **Test 4** – inactive row, `remove` rejects: asserts `reactivate` is **not** called (nothing to undo).
- **Test 5** – both `remove` and `reactivate` reject: asserts the rejection is still the original `deleteError`, not the secondary `reactivate failed too`.

## Relationships

- **`src/modules/locales/domain/deactivate-then-delete.ts`** – the sole import under test. The test file pins the contract of its exported `deactivateThenDelete(isActive, deactivate, remove, reactivate)` function: argument order, call sequencing, error propagation, and the reactivation side-effect on partial failure.

## Notes

- `deactivateThenDelete` is a pure coordination function — it takes its side-effecting operations as callbacks, making the tests dependency-free (no DB, no HTTP).
- The function's 4th parameter (`reactivate`) is only meaningful when `isActive` is `true`; the tests explicitly guard that it is never invoked for an already-inactive row.
- Error propagation is "first error wins": even a secondary reactivate failure does not replace the original delete error in the rejection.
- Tests use `.rejects.toBe(...).then(() => { … })` chaining (Vitest `expect` + `.then`) rather than `await expect(…).rejects` + separate assertions, so the post-rejection side-effect check lives in the `.then` callback.
