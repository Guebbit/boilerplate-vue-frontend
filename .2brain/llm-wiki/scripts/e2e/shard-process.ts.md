---
source: scripts/e2e/shard-process.ts
sha256: 9323052984298832ca19a4bc113c91059c2408be26388b7aab69482d2efa59d3
signature: 4c5b69c615f842f03e63defe6766eeede234a027b9c8d39438d4e6bef38759fa
generated_at: 2026-11-10T02:36:09.052971+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/shard-process.ts

## Purpose

Spawns a single E2E shard's command (e.g. a Cypress run) in a detached process group and watches it for progress. If the child produces no stdout or stderr output for a configurable window, a watchdog SIGKILLs the entire process group, preventing a hung browser from blocking the CI gate for an hour.

## Key elements

- **`WatchedResult`** (interface) — the shape of the resolved promise: `code`, `signal`, `hung` (whether the watchdog fired), and the accumulated `output`.
- **`liveGroups`** (module-level `Set<number>`) — tracks PIDs of still-running process groups so the `process.on('exit')` handler can reap them when the runner itself exits.
- **`killGroup(pid)`** (internal) — sends `SIGKILL` to the process group identified by negative PID; swallows errors for already-exited groups.
- **`runWatched(command, commandArguments, options)`** (exported) — the sole public API. Spawns the command with `detached: true`, pipes stdout/stderr, starts an interval-based watchdog, and resolves with a `WatchedResult`. Never rejects; spawn errors are folded into the result (code 1, error text appended to `output`).

## Relationships

- **`scripts/e2e/run-shards.ts`** — the caller/orchestrator. It invokes `runWatched` for each shard and relies on the module-level `liveGroups` cleanup so its own exit tears down any remaining child groups.
- **`tests/unit/scripts/e2e/shard-process.spec.ts`** — unit tests exercising `runWatched` (spawn, watchdog kill, error handling, output capture).

## Notes

- `detached: true` is load-bearing: without it the child shares the parent's process group and `killGroup` (negative PID) would not reach the Cypress process or its spawned browser—only the `npx` wrapper would die.
- The watchdog interval is `max(50, min(15 000, quietMs / 4))`; for typical minute-scale timeouts this checks roughly every 25 % of the window.
- `runWatched` is fire-and-forget with respect to errors: it always resolves. Callers must inspect `hung` and `code` rather than catching a rejection.
- stdin is set to `'ignore'`; only stdout and stderr are captured. Any output on either stream resets the silence timer.
