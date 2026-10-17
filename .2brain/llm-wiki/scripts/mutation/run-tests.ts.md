---
source: scripts/mutation/run-tests.ts
sha256: 8db5a2abad15c09952c0cf6d3bceb4afb2dcf2e15c26e766ccd133a3303b906c
generated_at: 2026-10-17T00:03:22.183803+00:00
model: ollama:qwen3.8:27b
---

# scripts/mutation/run-tests.ts

## Purpose

A thin wrapper around `npx stryker run` that adds three capabilities a JSON config cannot provide: resolving concurrency and heap from the local machine (via `.env`), clearing Stryker's `.stryker-tmp/` sandbox before starting (so a killed run doesn't leave a duplicate project copy), and aborting the run if the worker OOM-restart loop is detected.

## Key elements

- **`REPO_ROOT` / `SANDBOX_ROOT`** — Resolved via `import.meta.dirname` (two `..` up from `scripts/mutation/`). `SANDBOX_ROOT` is `.stryker-tmp/`, which is `rm`-ed at the start of every run.
- **`STRYKER_WORKER_PEAK_MB_ESTIMATE` (2500)** — A rough ceiling on per-worker RSS used only to derive a RAM-based concurrency cap. An estimate, not a measurement; the doc comment explains how to re-measure.
- **`OS_RESERVE_MB` (2048)** — RAM left unallocated for the OS/editor when computing the concurrency cap.
- **`OOM_LIMIT` (6) / `OOM_WINDOW_MS` (10 min)** — Threshold for the OOM-loop guard: 6+ "ran out of memory" restarts within 10 minutes triggers a `SIGTERM`.
- **`resolveConcurrency()`** — Returns `STRYKER_CONCURRENCY` from env if set; otherwise `min(cpuCount - 1, freeRAM / peakMB)`, floored at 1.
- **`positiveInteger(value)`** — Small parser that returns `undefined` for unset, empty, or non-positive-integer strings.
- **`main()`** — Clears the sandbox, spawns `npx stryker run …`, pipes stdout (counting OOM lines while forwarding bytes unchanged), and mirrors the child's exit code.
- **CLI passthrough** — `process.argv.slice(2)` is forwarded to Stryker. An explicit `--concurrency` flag in passthrough suppresses the auto-computed one.
- **`childEnvironment`** — Appends `--max-old-space-size=<heapMb>` to `NODE_OPTIONS` when `STRYKER_WORKER_HEAP_MB` is set.

## Relationships

No graph neighbors are listed for this file. It is a leaf script invoked via `npm run test:mutation` and read by no other module.

## Notes

- **Two-level `..` for repo root.** The file lives at `scripts/mutation/`, so one `..` lands in `scripts/`, not the repo root. Getting this wrong makes Stryker run against a directory with no config.
- **`process.loadEnvFile()` is best-effort.** Wrapped in `try/catch` because CI checkouts have no `.env`; that is the expected case, not an error.
- **Concurrency precedence:** CLI flag > `STRYKER_CONCURRENCY` env > computed from CPU/RAM. The committed `concurrency` in `stryker.config.json` is effectively ignored when this script is the entry point.
- **OOM guard is preventive, not reactive to this repo.** The doc comment notes this repo's Vitest/esbuild pipeline has not triggered the loop; the guard exists because the property that keeps it true is a configuration choice, not a guarantee.
- **Heap flag is containment, not a fix.** `--max-old-space-size` makes a leak fail faster; it does not prevent the leak. Left unset, Node derives its own limit from total system RAM.
- **Stdout is piped, not inherited.** This is required so the OOM line can be counted, but every chunk is written back to `process.stdout` unchanged, so the terminal experience is identical to a bare `stryker run`.
