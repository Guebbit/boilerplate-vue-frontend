---
source: tests/unit/scripts/demo/scratch-directory.spec.ts
sha256: 47d3d387ce1f81d479179903620e98e6d5899cac685eec5c84cd97087bee4f1f
signature: 67258b86026606c8a214a2fc248d3b677592bbd5b8cf6a57073f310cc0ed36d9
generated_at: 2026-11-10T08:13:56.438802+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/demo/scratch-directory.spec.ts

## Purpose

Unit tests for `scripts/demo/scratch-directory.ts`. Verifies that the per-process scratch directory used by a spawned demo backend (Mongo data) is created under the user cache rather than `os.tmpdir()`, is short enough for `tsx`'s Unix socket path, is removed cleanly including mongod leftovers, tolerates missing targets, and sweeps only the abandoned runs of dead PIDs on creation.

## Key elements

- **`deadPid()`** — Spawns a trivial `node -e ''` via `spawnSync` (which blocks until the child exits), then returns the now-released PID as a string. Used to fabricate a realistic "abandoned run" directory name.
- **`describe('demo-scratch')`** — Four test cases:
  - *creates a short, per-process directory* — Asserts existence, path prefix `~/.cache`, not under `os.tmpdir()`, length < 70, basename equals `process.pid`.
  - *removes the directory with whatever a killed mongod left in it* — Seeds a `mongo-mem-abc123/WiredTiger.lock` file, calls remove, asserts the whole tree is gone.
  - *tolerates a directory that is already gone* — Calls `removeDemoScratchDirectory` on a nonexistent path; expects no throw.
  - *sweeps the scratch of a run that is no longer running, and keeps a live one* — Creates a dead-PID sibling and a `not-a-pid` sibling under the same cache root; calls `createDemoScratchDirectory` again and asserts the dead one is gone, the live one and the foreign one survive.

## Relationships

- **`scripts/demo/scratch-directory.ts`** — The sole production dependency. The spec imports `createDemoScratchDirectory` and `removeDemoScratchDirectory` and exercises both their happy paths and edge cases (idempotent removal, cross-process cleanup).

## Notes

- The 70-character cap is a proxy for the real constraint: `tsx` opens a Unix socket under this directory, and Linux socket paths are capped at 108 bytes.
- Sweeping is a side-effect of **creation**, not a separate function — calling `createDemoScratchDirectory` a second time is what deletes the dead-PID siblings.
- Only directories whose **basename is a numeric PID** that no longer corresponds to a live process are swept; arbitrary siblings (e.g. `not-a-pid`) are left untouched.
- The target root is `~/.cache/<something>/<pid>` (the `~/.cache` prefix is asserted; the intermediate segment is `path.dirname(own)`).
- Tests use `try/finally` to clean up created directories, preventing cross-test pollution.
