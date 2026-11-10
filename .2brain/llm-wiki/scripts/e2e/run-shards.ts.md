---
source: scripts/e2e/run-shards.ts
sha256: 23db59c5fe701c03ab20892d9d6253ba89278de5ec153c3ce9e3b2a01d88f687
signature: 66d6243a04b80235d7b7683f1b40429d25d203152b1dce4781467e3c7e0502e8
generated_at: 2026-11-10T02:35:46.410955+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/run-shards.ts

## Purpose

CLI orchestrator behind `npm run test:e2e`: discovers all functional and antibot Cypress specs, balances them into N shards (default 4) using a longest-processing-time heuristic weighted by measured spec durations, boots one demo backend per shard, and spawns a parallel `cypress run` per shard against a single `vite preview` (built) server. It exists to cut the ~13-minute sequential gate to roughly the duration of the longest single spec, while keeping the demo profile safe (each shard isolates its own in-memory Mongo) and refusing to run under the live profile where sharding would be destructive.

## Key elements

- **`REPO_ROOT`** – Resolved two levels up from this file; base path for all spec globs.
- **Live-profile guard** – Exits with code 2 if `CYPRESS_liveProfile === 'true'`, because `cy.restore()` would reset one shared database under every shard.
- **`shardCount`** – Read from `E2E_SHARDS` env var (positive integer), defaults to 4.
- **Spec discovery** – `globSync(FUNCTIONAL_SPEC_GLOBS, …)` keyed by full posix relative path (not basename, since every module ships its own `a11y.cy.ts`). Sorted for stable shard assignment. Fails loudly (exit 2) if the glob matches zero files.
- **Duration resolution** – Merges `readSpecDurations()` (auto-appended by the `after:spec` hook) with the hand-written `SECONDS` table as a fallback; specs in neither are left for `weighSpecs` to schedule at the mean.
- **`weighSpecs` / `balanceShards`** – LPT balancing into `shardCount` groups.
- **Antibot shard** – Separately globbed via `ANTIBOT_SPEC_GLOBS`; appended as its own shard when specs exist, running with `ANTIBOT_BACKEND_ENV`.
- **`E2E_SLICE` support** – `parseSliceRequest` + `liveShardFiles` let a CI matrix job run one slice of the same balanced split; `antibot` selects only the antibot shard. An empty selection exits 2.
- **Spawn staggering** – Delays between shard spawns to avoid a cold-cache bundling race in Cypress (observed as `Unexpected end of input` / `cy.restore is not a function` on first run after a support-file edit).
- **`runWatched`** – Spawns and monitors each shard's Cypress process.
- **`judgeShard` / `countFinishedSpecs`** – Determines pass/fail verdict per shard after completion.
- **`failScript`** – Forces a non-zero process exit on any shard failure.
- **Flaky reporting** – `resetFlakyReport` before the run, `printFlakyReport` after.

## Relationships

- **`scripts/e2e/cypress-spec-globs.ts`** – Source of `FUNCTIONAL_SPEC_GLOBS` and `ANTIBOT_SPEC_GLOBS`; determines which files are discovered.
- **`scripts/e2e/shard-balancer.ts`** – Provides `SECONDS` (baseline durations), `weighSpecs`, and `balanceShards` used to partition the spec list.
- **`scripts/e2e/spec-durations.ts`** – Supplies `readSpecDurations()` (measured durations auto-recorded by the Cypress `after:spec` hook).
- **`scripts/e2e/shard-process.ts`** – Provides `runWatched` to spawn and supervise each shard's `cypress run` child process.
- **`scripts/e2e/shard-verdict.ts`** – Provides `countFinishedSpecs` and `judgeShard` to evaluate results per shard.
- **`scripts/e2e/live-shard.ts`** – Provides `parseSliceRequest` and `liveShardFiles` for CI slice partitioning (`E2E_SLICE=i/N`).
- **`scripts/e2e/antibot-backend.ts`** – Provides `ANTIBOT_BACKEND_ENV` applied when booting the antibot shard's backend.
- **`scripts/e2e/webhook-sink.ts`** – Provides `SHARD_SINK_PORT_BASE` and `sinkUrlForPort` for per-shard webhook endpoint assignment.
- **`scripts/e2e/flaky-report.ts`** – Provides `resetFlakyReport` / `printFlakyReport` for before/after reporting.
- **`scripts/pairing/paired-backend-path.ts`** – Provides `resolveBackendDemoCommand` and `resolveBackendDemoShardLimit` to locate and launch the paired demo backend.
- **`scripts/demo/scratch-directory.ts`** – Provides `createDemoScratchDirectory` / `removeDemoScratchDirectory` for per-shard temp directories.
- **`scripts/fail-script.ts`** – Provides `failScript` to exit non-zero on failure.

## Notes

- **Built bundle, not dev server.** The script explicitly targets `vite preview` output, not `vite dev`. Four concurrent browsers on a dev server trigger on-demand compilation that lands inside Cypress timeouts, producing spurious flakes. This is the single most important operational constraint.
- **Spec key is the full relative path, not the basename.** Every module ships its own `a11y.cy.ts`; keying by basename would apply one module's measured duration to all of them.
- **Zero-spec guard is deliberate.** A broken `REPO_ROOT` or a glob that matches nothing would otherwise let every shard "pass" having run nothing, turning a broken CI gate green. The script exits 2 instead.
- **Live profile is structurally unsafe for sharding**, not merely discouraged. The guard is a hard `process.exit(2)`, not a warning.
- **`E2E_SLICE` must produce a non-empty shard** or the run exits 2 — same silent-green defense.
- **Durations self-improve.** Each `cypress run` appends measured times via the `after:spec` hook; the `SECONDS` table is only a cold-start fallback.
- **Antibot shard is conditional.** If no spec matches `ANTIBOT_SPEC_GLOBS`, no extra backend is booted and no antibot shard appears in the plan.
