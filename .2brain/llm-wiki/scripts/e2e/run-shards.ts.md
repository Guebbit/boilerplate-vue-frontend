---
source: scripts/e2e/run-shards.ts
sha256: e64f171e09a219c6f0862c15a0106f31b0f9923e0915de2b88a4a29309583feb
generated_at: 2026-10-02T11:36:41.285654+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/run-shards.ts

## Purpose

The worker behind `npm run test:e2e`. It schedules Cypress functional and antibot specs across a configurable number of parallel shards (default 4) against a single `vite preview` build, each shard paired with its own in-memory demo backend. It exists to cut wall-clock from ~13 min sequential to the longest single spec, while preserving per-shard data isolation that would be unsafe under the live profile.

## Key elements

- **`REPO_ROOT`** — resolved via `import.meta.dirname` two levels up; all globs and paths anchor here.
- **`positiveInteger`** — parses an env value to a positive int or returns `undefined`.
- **`shardCount`** — `E2E_SHARDS` env, defaulting to 4.
- **`specs`** — `globSync(FUNCTIONAL_SPEC_GLOBS)` results, normalised to posix separators and sorted for stable shard assignment.
- **`durations`** — merged map preferring `readSpecDurations()` (auto-appended by `after:spec`) over the hand-written `SECONDS` table; specs in neither are left out so `weighSpecs` schedules them at the mean.
- **`weighSpecs` / `balanceShards`** (from `shard-balancer.ts`) — LPT assignment of weighted specs onto the least-loaded shard.
- **`antibotSpecs` / `active`** — antibot-globbed specs form one dedicated shard (requires the human-challenge provider env); combined into the final shard list.
- **`SHARD_STAGGER_MS` (4000)** — inter-shard spawn delay that lets the first `cypress run` populate the webpack/vite cache before others read it, avoiding a truncated-bundle race observed on cold runs.
- **`LOG_DIR`** — `reports/e2e/`; failing shards' full stdout/stderr are written here for CI artifact upload.
- **`DEMO_PORT_BASE` (3101)** — shard *N* listens on `3101 + N`.
- **`backendEnvironmentFor`** — builds per-shard env: `NODE_WEBHOOK_DEMO_SINK_URL` from `webhook-sink.ts`, plus `ANTIBOT_BACKEND_ENV` for the antibot shard.
- **`bootDemoBackends`** — resolves the demo command via `resolveBackendDemoCommand()`, enforces `resolveBackendDemoShardLimit()`, boots backends in parallel, waits for `GET /` 200, and returns a cleanup callback that kills all children on any exit path.
- **Live-profile guard** — if `CYPRESS_liveProfile === 'true'`, prints an explanatory error and exits 2 before doing any work.
- **Empty-spec guard** — if the glob matches zero files, exits 2 with a diagnostic rather than letting four empty shards "pass".

## Relationships

- **`cypress-spec-globs.ts`** — source of `FUNCTIONAL_SPEC_GLOBS` and `ANTIBOT_SPEC_GLOBS`; the only place the glob patterns are defined.
- **`shard-balancer.ts`** — provides `weighSpecs`, `balanceShards`, and the `SECONDS` fallback table; all LPT logic lives there.
- **`spec-durations.ts`** — `readSpecDurations()` supplies the measured per-spec durations that override the static table.
- **`webhook-sink.ts`** — `SHARD_SINK_PORT_BASE` and `sinkUrlForPort` give each shard's backend the URL of that shard's own sink listener.
- **`antibot-backend.ts`** — `ANTIBOT_BACKEND_ENV` carries the extra env vars the antibot shard's backend needs.
- **`paired-backend-path.ts`** — `resolveBackendDemoCommand()` and `resolveBackendDemoShardLimit()` determine *how* to boot and *how many* shards the paired backend supports.
- **`scratch-directory.ts`** — `createDemoScratchDirectory` / `removeDemoScratchDirectory` provide per-shard temp directories (e.g., for uploaded fixtures) that are cleaned up after the run.
- **`flaky-report.ts`** — `resetFlakyReport` is called at start; `printFlakyReport` is called at end to summarise which specs flaked across shards.
- **`tests/unit/scripts/e2e/cypress-spec-globs.spec.ts`** — unit-tests the glob patterns consumed by this file; a regression there would change what this script schedules.

## Notes

- **BUILT bundle, not dev server.** The file header documents measured failures (2/3 runs failing on a dev server vs. 4/4 green on a build) caused by on-demand route compilation competing with Cypress timeouts. Do not swap `vite preview` back to `vite dev`.
- **Glob keying is full relative path, not basename.** Multiple modules ship an `a11y.cy.ts`; a basename key would assign the same duration to all of them (FA126).
- **No specs ≠ empty suite.** The script treats zero matches as a path-resolution bug and exits 2, preventing a silent green gate.
- **Stagger is cold-cache-only.** The 4 s delay is essentially free on warm runs but prevents a `Unexpected end of input` / `cy.restore is not a function` class of failure on the first sharded run after a support-file edit.
- **Orphaned backends are a real risk.** `bootDemoBackends` returns a cleanup function that must be called on every exit path; a leaked child holds its port and surfaces next run as a confusing `EADDRINUSE`.
- **Live profile is hard-refused, not just discouraged.** The guard checks `CYPRESS_liveProfile` before any work; the live suite is expected to run sequentially via `npm run test:e2e:live`.
