---
source: scripts/demo/scratch-directory.ts
sha256: 8c690540921b37c7b55b77242a293bf2be8720195c182183fd90d1e2dd6d3a81
generated_at: 2026-10-02T11:31:58.014791+00:00
model: ollama:qwen3.8:27b
---

# scripts/demo/scratch-directory.ts

## Purpose

Provides a disk-backed, per-PID scratch directory for demo backends that this repo spawns. `mongodb-memory-server` writes its data under `TMPDIR` and only deletes it on a graceful `stop()`; a killed backend (SIGTERM, ^C, crash) leaves ~200 MB behind. This module redirects `TMPDIR` to a short path under the user's cache directory and sweeps abandoned directories on the next creation, bounding the cost of a leak to one subsequent run.

## Key elements

- **`createDemoScratchDirectory(): string`** (exported) — Sweeps abandoned scratch dirs, then creates (and returns) a fresh `~/.cache/boilerplate-vue-frontend-demo/<pid>` directory. Callers pass the return value as `TMPDIR` to the spawned backend.
- **`removeDemoScratchDirectory(directory: string): void`** (exported) — Best-effort recursive removal of a scratch directory. Synchronous and exception-swallowing by design; intended for use inside `process.on('exit')`.
- **`isProcessAlive(pid): boolean`** (internal) — Uses `process.kill(pid, 0)` to probe the kernel. Treats `EPERM` as "alive" (recycled PID belonging to another user) to avoid deleting a still-writing backend's data.
- **`sweepAbandonedScratchDirectories(): void`** (internal) — Iterates cache-root entries; removes any whose name is a valid positive integer PID whose process no longer exists. Non-numeric entries are left untouched.
- **`CACHE_ROOT`** (internal constant) — `~/.cache/boilerplate-vue-frontend-demo`. Kept deliberately short to stay within the 108-byte Unix socket path limit used by `tsx` IPC.

## Relationships

- **`scripts/demo/run-backend.ts`** — The spawned backend process that receives the `TMPDIR` path returned by `createDemoScratchDirectory` and whose lifecycle (spawn, SIGTERM, `process.on('exit')`) drives both creation and cleanup.
- **`scripts/e2e/run-shards.ts`** — The shard runner that sends SIGTERM to backends; the very signal that makes graceful `stop()` unreachable and triggers the leak this module mitigates.
- **`tests/unit/scripts/demo/scratch-directory.spec.ts`** — Unit tests exercising the create, sweep, and remove logic.

## Notes

- The path is intentionally short: `TMPDIR` doubles as the location for `tsx`'s IPC socket, and Unix socket paths are capped at 108 bytes. A longer root (e.g. under `node_modules/.cache/…`) causes `listen EINVAL`.
- `removeDemoScratchDirectory` is synchronous and catches all errors; it is safe to call from `process.on('exit')` where async work is impossible. A file still held open by a dying process simply remains until the next `mkdir` overwrites the directory.
- Sweep-on-create (not a cron or GC) is what bounds leak cost: the next run reclaims abandoned directories rather than letting them accumulate until manually noticed.
- Directory names are raw PIDs. Any entry that is not a positive integer is assumed to have been created by something else and is never touched.
