---
source: tests/unit/scripts/e2e/spec-durations.spec.ts
sha256: ab9aeec1c26b88cfbb2b8dc2f48fdbb5a84594a048ed844ce66053ded1d00aef
signature: c8b50a42b153cb27f5fcddc66c56f4d381cd148c5ededb440f17cfa69618d4ca
generated_at: 2026-11-10T08:18:23.407236+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/spec-durations.spec.ts

## Purpose

Unit tests for the `readSpecDurations` / `recordSpecDuration` pair in the E2E shard-balancer script. Verifies that per-file duration weights are keyed by full spec path (not basename), that repeated runs overwrite prior values, and that malformed JSONL lines are tolerated rather than fatal. All I/O is driven against a throwaway temp directory so the real `reports/` tree is never touched.

## Key elements

- **`reportFile()`** – Creates a fresh temp directory (via `mkdtempSync`) and returns a path ending in `nested/durations.jsonl`. Pushes the directory onto the `scratch` array for cleanup.
- **`scratch`** – Module-level array of temp directories, drained and removed in `afterEach`.
- **`describe('readSpecDurations')`** – Four cases:
  - Returns `{}` when the file has never been written.
  - Keys results by full spec path, so two specs sharing a basename (`a11y.cy.ts` under different module dirs) produce distinct entries.
  - Retains only the most recently recorded duration for a given spec.
  - Skips an appended unparseable JSONL line without throwing, preserving previously valid entries.

## Relationships

- **`scripts/e2e/spec-durations.ts`** – The module under test. This spec imports `readSpecDurations` and `recordSpecDuration` from it and exercises both against temp-file I/O.

## Notes

- `reportFile()` returns a path under a `nested/` subdirectory that is **not** explicitly created with `mkdirSync`. The test relies on `recordSpecDuration` (or its internal write) to create parent directories; if the implementation changes to assume the directory exists, these tests will fail with ENOENT before the assertion runs.
- Cleanup uses `rmSync(dir, { recursive: true, force: true })` inside `afterEach` after splicing the array — a single failed `afterEach` will leave orphaned temp dirs on the host.
- The test intentionally appends raw `'{not json\n'` to the file (via `writeFileSync` with `flag: 'a'`) to simulate a partially-written or corrupted line; it does not test recovery of *valid* data that follows the bad line.
