# scripts/backend-demo-scratch-directory.ts

## Purpose

Provides a disk-backed scratch directory (under `~/.cache/boilerplate-vue-frontend-demo/<pid>`) to serve as `TMPDIR` for demo backends spawned by this repo. This keeps `mongodb-memory-server` data off the RAM-backed tmpfs that fills up when a backend is killed mid-run, and reclaims leaked directories on the next invocation.

## Key elements

- **`createDemoScratchDirectory()`** *(exported)* — Sweeps abandoned scratch dirs, then creates a new one named after `process.pid` and returns its absolute path. Intended to be passed as `TMPDIR` to a spawned backend.
- **`removeDemoScratchDirectory(directory)`** *(exported)* — Synchronous, best-effort `rmSync`. Designed to run from `process.on('exit')` where async I/O is unavailable.
- **`isProcessAlive(pid)`** *(internal)* — Uses `process.kill(pid, 0)` to test existence; treats `EPERM` (recycled PID owned by another user) as alive to avoid deleting a still-running backend's data.
- **`sweepAbandonedScratchDirectories()`** *(internal)* — Iterates cache-root entries, removes those whose numeric name corresponds to a dead PID. Ignores non-numeric entries.
- **`CACHE_ROOT`** *(internal const)* — `~/.cache/boilerplate-vue-frontend-demo`. Deliberately short to stay under the 108-byte Unix socket path limit that `tsx` requires for its IPC socket in `TMPDIR`.

## Relationships

- **`scripts/run-backend-demo.ts`** — Consumes `createDemoScratchDirectory` to set `TMPDIR` before spawning the demo backend, and `removeDemoScratchDirectory` on exit.
- **`scripts/run-e2e-shards.ts`** — The shard runner whose SIGTERM kills backends; this module's sweep logic is the mitigation for the directories that runner leaves behind.
- **`tests/unit/scripts/backend-demo-scratch-directory.spec.ts`** — Unit tests for the exported functions and the PID-liveness heuristic.
- **`src/modules/locales/tests/use-dictionary-aggregation.spec.ts`** — A test in the dependency graph that also spawns a demo backend and therefore depends on the scratch-directory contract.

## Notes

- The directory name **is** the PID. Any non-numeric entry in the cache root is left untouched.
- `removeDemoScratchDirectory` swallows all errors on purpose: a file held open by a dying process is acceptable; the next run's `mkdirSync` overwrites it.
- The sweep is a **reclaim-on-next-run** strategy, not a background cleaner. A leaked directory persists until the next `createDemoScratchDirectory` call.
- The path length constraint (Unix socket 108-byte cap) is a hard invariant; do not relocate `CACHE_ROOT` deeper without verifying the full `TMPDIR` + socket path stays under that limit.
