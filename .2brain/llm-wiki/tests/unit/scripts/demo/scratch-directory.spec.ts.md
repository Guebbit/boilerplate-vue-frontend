---
source: tests/unit/scripts/demo/scratch-directory.spec.ts
sha256: 47d3d387ce1f81d479179903620e98e6d5899cac685eec5c84cd97087bee4f1f
generated_at: 2026-10-17T02:41:45.298356+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/demo/scratch-directory.spec.ts

## Purpose

Unit tests for `scripts/demo/scratch-directory.ts`. Verifies that the demo backend's MongoDB scratch directory is placed in a per-process location under `~/.cache` (off tmpfs, short enough for `tsx`'s Unix socket), that removal is recursive and idempotent, and that creating a new scratch directory sweeps leftover directories from previously-killed runs while leaving foreign (non-pid-named) directories untouched.

## Key elements

- **`deadPid()`** — Spawns a no-op Node process via `spawnSync` and returns its now-dead PID as a string. Guarantees the PID is fully released (not a zombie), so the name can be used to simulate an abandoned run's scratch folder.
- **`describe('demo-scratch')`** — Four test cases:
  - *creates a short, per-process directory under the user cache* — asserts existence, `~/.cache` prefix, absence of `os.tmpdir()` prefix, length < 70, and basename === `process.pid`.
  - *removes the directory with whatever a killed mongod left in it* — seeds a fake `mongo-mem-*/WiredTiger.lock` subtree, then asserts recursive removal.
  - *tolerates a directory that is already gone* — calls `removeDemoScratchDirectory` on a non-existent path and expects no throw.
  - *sweeps the scratch of a run that is no longer running, and keeps a live one* — plants a dead-pid dir and a `not-a-pid` dir under the cache root; asserts that calling `createDemoScratchDirectory` removes the dead-pid dir, preserves the current run's dir, and leaves the foreign dir intact.

## Relationships

- **`scripts/demo/scratch-directory.ts`** (the system under test) — imports and exercises its two exports: `createDemoScratchDirectory` (idempotent create + sweep) and `removeDemoScratchDirectory` (recursive, non-throwing delete).

## Notes

- The 70-character length cap in the first test is a safety margin beneath the 108-byte Unix socket path limit that `tsx` hits when it opens its IPC socket under `TMPDIR`; the scratch dir is deliberately kept off `os.tmpdir()` for that reason.
- Sweeping (removing abandoned scratch dirs) is a side-effect of **creation**, not removal. A test must call `createDemoScratchDirectory` to trigger the cleanup.
- Only directories whose basename parses as a PID are candidates for sweeping; names like `not-a-pid` are intentionally preserved, so the function is not a blanket `rm -rf` of the cache parent.
- `deadPid()` relies on `spawnSync` blocking until the child is reaped, so the returned PID is guaranteed dead at call time — no race with `kill(pid, 0)` checks.
