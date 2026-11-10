---
source: scripts/demo/scratch-directory.ts
sha256: fbbba1643c6937a7f30fa99666e105463916f5c08e0bde26504452648099c77b
signature: 30e5929d4c24211cf8919feec42ae18194144d76017351a0d673ff9f811ae09f
generated_at: 2026-11-10T02:29:30.162534+00:00
model: ollama:qwen3.8:27b
---

# scripts/demo/scratch-directory.ts

## Purpose

Provides a disk-backed scratch directory (under `~/.cache/`) for demo MongoDB backends spawned by this repo, replacing the RAM-backed `os.tmpdir()`. Because killed backends (SIGTERM, ^C, crash) leave ~200 MB of mongod data behind, the module also sweeps stale scratch directories whose owning process is no longer running, bounding the cost of any leak to one subsequent run.

## Key elements

- **`CACHE_ROOT`** (constant) – `~/.cache/boilerplate-vue-frontend-demo`; parent of all per-run scratch dirs. Deliberately short (see Notes).
- **`isProcessAlive(pid)`** (internal) – Uses `process.kill(pid, 0)` to test existence. Treats `EPERM` (recycled PID owned by another user) as *alive* to avoid deleting a live backend's data.
- **`sweepAbandonedScratchDirectories()`** (internal) – Iterates `CACHE_ROOT` entries; anything named after a dead PID is removed. Non-numeric entries are left untouched.
- **`createDemoScratchDirectory(): string`** (exported) – Sweeps abandoned dirs, then creates `<CACHE_ROOT>/<process.pid>`. Returns the absolute path, intended to be passed as `TMPDIR` to the spawned backend.
- **`removeDemoScratchDirectory(directory: string): void`** (exported) – Synchronous, best-effort `rmSync({ recursive, force })`. Designed to be called from `process.on('exit')` where async work is impossible.

## Relationships

- **`scripts/demo/run-backend.ts`** – The primary consumer: calls `createDemoScratchDirectory()` to obtain the `TMPDIR` value for the spawned backend and registers `removeDemoScratchDirectory` on exit.
- **`scripts/e2e/run-shards.ts`** – The shard runner that SIGTERMs backends; the "killed backend leaves data behind" scenario this module mitigates originates here.
- **`tests/unit/scripts/demo/scratch-directory.spec.ts`** – Unit tests covering creation, sweep, and removal logic.

## Notes

- **Unix socket path limit.** `TMPDIR` is also where `tsx` opens its IPC socket. Unix socket paths are capped at 108 bytes; a longer root (e.g. under `node_modules/.cache/…`) caused `listen EINVAL` before MongoDB even started. Keep `CACHE_ROOT` short.
- **Synchronous removal is intentional.** `removeDemoScratchDirectory` runs in a `process.on('exit')` handler where no I/O promise can resolve. If a file is still held open by a dying process, the error is swallowed; the next run's `mkdirSync` overwrites the stale path.
- **The sweep, not the exit handler, is the real safety net.** `SIGKILL` bypasses all JS handlers. The sweep on the *next* run is what actually reclaims leaked space.
- **Directory names are PIDs.** This makes liveness a simple kernel check and lets the sweep skip anything it didn't create (non-numeric entries).
