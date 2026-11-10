---
source: scripts/mutation/run-tests.ts
sha256: 7d6beaae6917b8f6be98d22abe2ee2ea2cdeb561ee1813fc776e96e530e0c3dc
signature: 1ecdf4eb75d5f04506e51d132f0b4f5ce2347951790baa17751f1e008b372dc9
generated_at: 2026-11-10T02:46:10.185350+00:00
model: ollama:qwen3.8:27b
---

# scripts/mutation/run-tests.ts

## Purpose

Wrapper around `stryker run` (invoked via `npm run test:mutation`) that handles four things a static `stryker.config.json` cannot: deriving machine-appropriate concurrency and heap from `.env`, clearing Stryker's sandbox directory before each run, aborting early when an OOM-restart loop is detected, and preserving a full mutation report when only a subset of files is mutated.

## Key elements

- **`main()`** — Entry point. Removes `.stryker-tmp/`, spawns `npx stryker run …`, streams stdout (counting OOM restarts), and on exit either aborts, calls `keepReportWhole()`, and mirrors Stryker's exit code.
- **`resolveConcurrency()`** — Returns `STRYKER_CONCURRENCY` if set; otherwise computes `min(CPUs − 1, free-RAM / STRYKER_WORKER_PEAK_MB_ESTIMATE)`, floored at 1.
- **`keepReportWhole()`** — When the run was partial (`--mutate`/`-m` present) and the report's mtime changed, merges the new report over the previous one via `overlayReport` and re-renders `index.html`.
- **`positiveInteger()`** — Parses an env-var value into a positive int or returns `undefined`.
- **`STRYKER_WORKER_PEAK_MB_ESTIMATE` (2500)** — Per-worker RSS estimate used in the RAM cap; explicitly an estimate, not a measurement.
- **`OOM_LIMIT` / `OOM_WINDOW_MS`** — 6 restarts within 10 minutes triggers a `SIGTERM` abort with a diagnostic message.
- **`childEnvironment`** — Forwards `--max-old-space-size` into `NODE_OPTIONS` when `STRYKER_WORKER_HEAP_MB` is set.
- **`passthrough` / `strykerArguments`** — CLI args after the script name; `--concurrency` is injected only if the caller didn't supply one.

## Relationships

- **`scripts/mutation/baseline.ts`** — Exports `MUTATION_REPORT_PATH`, which this file uses to construct the absolute path to the Stryker JSON report and the adjacent HTML page it reads and writes.
- **`scripts/mutation/overlay.ts`** — Exports `overlayReport` (merges a partial Stryker report into a previous full one), `renderHtml` (re-renders the HTML page from merged data), and the `StrykerReport` type. All three are called by `keepReportWhole()`.
- **`scripts/fail-script.ts`** — Exports `failScript`, used as the `.catch()` handler on `main()` to produce a clean non-zero exit with a message.

## Notes

- Uses `import.meta.dirname` (ESM / Node ≥ 20.11) rather than `__dirname`; the file is at `scripts/mutation/`, so REPO_ROOT is two levels up.
- `process.loadEnvFile()` (built-in, not dotenv) loads `.env`; CI has no `.env` and that is the expected case — the `try/catch` swallows the error silently.
- The OOM counter matches the literal string `ran out of memory` in Stryker's stdout. A single restart is tolerated; the guard fires only at ≥ 6 within the window.
- `STRYKER_WORKER_PEAK_MB_ESTIMATE` is a guess sized above Stryker's own 2048 MB default. The comment directs re-measurement with `npx stryker run --mutate <file> --concurrency 1` if OOM restarts ever appear.
- This file is intentionally a sibling (same shape, different bytes) to the backend repo's equivalent script; it cleans a different scratch root because the backend runner starts an in-memory MongoDB while this one does not.
