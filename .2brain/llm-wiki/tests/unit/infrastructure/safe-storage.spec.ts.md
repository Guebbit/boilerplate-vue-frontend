---
source: tests/unit/infrastructure/safe-storage.spec.ts
sha256: c1694de93abc4ed58fc02eadd299fd9399063f76bd24e4e80c5c7b25a9f90cf8
signature: c1694de93abc4ed58fc02eadd299fd9399063f76bd24e4e80c5c7b25a9f90cf8
generated_at: 2026-11-10T08:03:17.341869+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/safe-storage.spec.ts

## Purpose

Unit tests for the `safe-storage` utility module. Verifies that JSON read/write through `localStorage`/`sessionStorage` is always non-throwing (damaged text → `undefined`, blocked storage → silent no-op) and that prefix-based bulk removal targets only the intended keys.

## Key elements

- **`beforeEach`** – clears both `localStorage` and `sessionStorage` before every test to isolate state.
- **`describe('safe-storage')`** – single describe block containing five `it` cases:
  - *round-trips a value in the chosen area only* – confirms `writeJson`/`readJson` scope to the selected area (`'local'` vs `'session'`).
  - *removes the key when the value is undefined* – calling `writeJson` with no value deletes the key rather than storing the string `"undefined"`.
  - *reads damaged text as nothing saved* – malformed JSON in storage returns `undefined` from both `readJson` and `parseJsonSafe` (never throws).
  - *swallows blocked storage on read and write* – mocks `Storage.prototype.getItem`/`setItem` to throw; asserts `readJson` returns `undefined` and `writeJson` does not throw.
  - *removes only keys with the prefix* – `removeByPrefix` deletes matching keys and leaves unrelated keys untouched.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The blocked-storage test mocks `Storage.prototype` methods via `vi.spyOn`. There is no `vi.restoreAllMocks()` or `afterEach` call in this file; if a future test runs after the blocked-storage case in the same worker, it must account for or reset those mocks.
- The file uses the `@/` path alias; Vitest config must resolve it for the import to work.
