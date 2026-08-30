# scripts/run-mutation-tests.ts

## Purpose

Wrapper around `npx stryker run` that handles three concerns a static JSON config cannot: injecting machine-specific settings (`concurrency`, worker heap) from `.env`, clearing the `.stryker-tmp/` sandbox before each run, and detecting the OOM/strand loop so a non-converging run is killed in seconds instead of hours.

## Key elements

- **`main()`** — Top-level async flow: removes `SANDBOX_ROOT`, spawns Stryker as a child process, and wires the stdout OOM monitor.
- **`positiveInteger(value)`** — Parses an env-var string into a validated positive integer or `undefined`.
- **`concurrency` / `heapMb`** — Read from `STRYKER_CONCURRENCY` and `STRYKER_WORKER_HEAP_MB` (loaded via `process.loadEnvFile()`).
- **`strykerArguments`** — Builds the argv for Stryker. `--concurrency` is injected only when set via env *and* not already present in the passthrough args (CLI always wins).
- **`passthrough`** — `process.argv.slice(2)`, forwarded verbatim to Stryker so callers can override anything.
- **`childEnvironment`** — Spreads `process.env` and conditionally appends `--max-old-space-size=<heapMb>` to `NODE_OPTIONS` for worker containment.
- **`OOM_LIMIT` / `OOM_WINDOW_MS`** — 6 restarts within 10 minutes triggers the kill.
- **Stdout OOM monitor** — Pipes Stryker's stdout, counts occurrences of `ran out of memory`, and sends `SIGTERM` to the child when the threshold is crossed. All chunks are forwarded to the terminal unchanged.
- **`SANDBOX_ROOT`** — `.stryker-tmp` at the repo root; removed with `rm({ recursive: true, force: true })` before each run.

## Relationships

- **`stryker.config.json`** — The spawned `npx stryker run` process reads this file as its base configuration. The script does not parse it directly; it only supplies CLI flags (`--concurrency`, `--max-old-space-size` via `NODE_OPTIONS`) that override or augment whatever the config declares.

## Notes

- **Precedence:** explicit CLI flag > `.env` value > `stryker.config.json`. This keeps CI's `--concurrency 3` authoritative even when no `.env` exists.
- **Exit code on OOM abort** is forced to `1` regardless of what Stryker's exit code would have been.
- **The OOM guard is preventive, not reactive.** This repo (vitest + esbuild) does not currently hit the loop because esbuild type-checks nothing and caches nothing per mutant. The guard protects against a future config change (e.g. enabling vitest's `typecheck`) reintroducing the problem documented in the backend.
- **`process.loadEnvFile()` is wrapped in a try/catch** because CI checkouts have no `.env`; that is the normal case there.
- **Mirror script:** a backend repo has an equivalent `scripts/run-mutation-tests.ts`; the only difference is the scratch cleanup (the backend runner also starts an in-memory MongoDB per suite).
