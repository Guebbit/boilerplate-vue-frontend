---
source: scripts/mutation/run-tests.ts
sha256: 72674bde7c6ccab660794b84dc9c2ccbd2b4c191e9a4dd7d048477cab9139b6a
generated_at: 2026-10-02T11:39:58.393634+00:00
model: ollama:qwen3.8:27b
---

# scripts/mutation/run-tests.ts

## Purpose

A CLI wrapper around `npx stryker run` that handles three concerns a static `stryker.config.json` cannot: sourcing machine-specific settings (`concurrency`, per-worker heap) from `.env`, clearing Stryker's sandbox directory before the run, and aborting the run early when it detects an OOM-restart loop. It exists so a developer's laptop and a CI runner can disagree on resource usage without either editing a tracked file.

## Key elements

- **`REPO_ROOT`** — Resolved via `import.meta.dirname` + `../..`; the `cwd` passed to the spawned Stryker process.
- **`SANDBOX_ROOT`** — `.stryker-tmp/` at the repo root; removed with `rm(..., { recursive: true, force: true })` before each run to avoid accumulating orphaned project copies after killed runs.
- **`STRYKER_WORKER_PEAK_MB_ESTIMATE`** (2500) / **`OS_RESERVE_MB`** (2048) — Constants used by `resolveConcurrency` to cap workers by available RAM.
- **`OOM_LIMIT`** (6) / **`OOM_WINDOW_MS`** (10 min) — Thresholds that distinguish a survivable restart from a non-converging loop.
- **`positiveInteger(value)`** — Parses an env-var string to a positive integer or `undefined`.
- **`resolveConcurrency()`** — Returns `STRYKER_CONCURRENCY` if set; otherwise the minimum of `logical CPUs − 1` and `free RAM / peak estimate`, floored at 1.
- **`main()`** — Cleans the sandbox, spawns `npx stryker run` with `stdio: ['inherit', 'pipe', 'inherit']`, forwards stdout chunks to the terminal while counting `"ran out of memory"` occurrences, and sends `SIGTERM` when the OOM threshold is crossed.

## Relationships

No graph neighbors are recorded for this file. It is a leaf script: it spawns an external process (`npx stryker`) and reads only `node:child_process`, `node:fs/promises`, `node:os`, and `node:path`.

## Notes

- The shebang is `#!/usr/bin/env tsx`; the file is a TypeScript script executed directly, not compiled.
- `process.loadEnvFile()` is called in a bare `try/catch` because CI checkouts have no `.env` — the catch is intentional and silent.
- CLI passthrough args (everything after the script name) are forwarded verbatim. A `--concurrency` flag on the CLI suppresses the auto-computed value entirely.
- The OOM counter is a simple substring count of `"ran out of memory"` across all stdout chunks; it does not parse structured output.
- A parallel wrapper exists in the backend project at the same relative path (`scripts/mutation/run-tests.ts`); it cleans a different scratch root and carries a CommonJS `__dirname` fallback, but the shape and intent are identical.
- `STRYKER_WORKER_PEAK_MB_ESTIMATE` is explicitly an estimate, not a measurement. The comment advises re-measuring with a single-file, single-concurrency run if OOM restarts ever appear in this repo.
