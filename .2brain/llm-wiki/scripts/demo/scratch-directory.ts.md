---
source: scripts/demo/scratch-directory.ts
sha256: fbbba1643c6937a7f30fa99666e105463916f5c08e0bde26504452648099c77b
generated_at: 2026-10-16T23:59:28.599663+00:00
model: ollama:qwen3.8:27b
---

# scripts/demo/scratch-directory.ts

## Purpose

Provides a disk-backed scratch directory for demo backends (primarily `mongodb-memory-server`) that this repo spawns. It redirects `TMPDIR` away from the RAM-backed `/tmp` (which fills up when a killed `mongod` leaves ~200 MB behind) and onto the user's disk under `~/.cache`. Each call also sweeps directories abandoned by previously crashed or killed runs, bounding the cost of a leak to one run-cycle.

## Key elements

- **`CACHE_ROOT`** (internal) — `~/.cache/boilerplate-vue-frontend-demo`; parent of every per-run scratch dir. Deliberately short to stay within the 108-byte Unix-socket path limit that `tsx` enforces on `TMPDIR`.
- **`isProcessAlive(pid)`** (internal) — Tests liveness via `process.kill(pid, 0)`. Treats `EPERM` as "alive" (conservative: a false-positive just delays cleanup; a false-negative would delete a live backend's data).
- **`sweepAbandonedScratchDirectories()`** (internal) — Iterates `CACHE_ROOT` entries, removes any whose PID is no longer running. Non-PID entries are left untouched.
- **`createDemoScratchDirectory()`** (exported) — Sweeps abandoned dirs, then `mkdirSync`s `<CACHE_ROOT>/<process.pid>` and returns the absolute path to pass as `TMPDIR` to the spawned backend.
- **`removeDemoScratchDirectory(directory)`** (exported) — Best-effort synchronous `rmSync` of a scratch dir. Intended to run from `process.on('exit')` (hence synchronous; nothing async survives that hook).

## Relationships

- **`scripts/demo/run-backend.ts`** — Calls `createDemoScratchDirectory()` to obtain the `TMPDIR` value passed to the spawned demo backend process, and calls `removeDemoScratchDirectory()` on clean exit.
- **`scripts/e2e/run-shards.ts`** — The shard runner that can SIGTERM backends (the "killed run" scenario this module's sweep handles). Does not import this file directly; the interaction is through the backend process it manages.
- **`tests/unit/scripts/demo/scratch-directory.spec.ts`** — Unit tests covering the sweep and create/remove logic of this module.

## Notes

- The directory path **must stay short**. `TMPDIR` is also where `tsx` opens its IPC socket; a path exceeding 108 bytes causes `listen EINVAL` before Mongo even starts. The cache root name is intentionally terse.
- `isProcessAlive` is deliberately **optimistic** (EPERM → alive). A recycled PID causes one extra cycle of cleanup delay; the opposite error would destroy in-flight data.
- `removeDemoScratchDirectory` swallows all errors. A file still held open by a dying process won't block the next run because `mkdirSync({ recursive: true })` overwrites.
- Directory naming is `String(process.pid)`; any non-integer or non-positive entry in `CACHE_ROOT` is considered foreign and skipped during sweep.
