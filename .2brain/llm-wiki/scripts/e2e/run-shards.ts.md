---
source: scripts/e2e/run-shards.ts
sha256: cd597a173d52024b1200f043c281bb36d9b11ab8d0f77ed2ce7888ce4c2f396e
generated_at: 2026-10-17T00:01:17.008327+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/run-shards.ts

## Purpose

Entry-point script (run via `tsx`) that fans out the Cypress e2e suite into N parallel shards against a single **built** preview server, booting one isolated demo backend per shard. It exists to cut wall-clock from ~13 min to ~2.5 min on a 16-core machine without relying on Cypress Cloud, while guaranteeing shard isolation (own in-memory DB, own webhook sink) and refusing to run under the live profile where that isolation is impossible.

## Key elements

- **Shard count** — read from `E2E_SHARDS` env var, defaults to 4.
- **Spec discovery** — `globSync(FUNCTIONAL_SPEC_GLOBS)` relative to `REPO_ROOT`; POSIX-normalised and sorted for stable assignment. Fails loudly (exit 2) if zero specs match.
- **Duration weighting** — merges `readSpecDurations()` (recorded per-run) with the `SECONDS` fallback table from `shard-balancer.ts`; specs with no data in either are excluded so `weighSpecs` assigns them the mean.
- **Balancing** — `balanceShards(weighted, shardCount)` performs LPT (longest-first onto least-loaded).
- **Antibot shard** — specs matching `ANTIBOT_SPEC_GLOBS` are appended as a single extra shard carrying `ANTIBOT_BACKEND_ENV`; absent when no spec matches.
- **`bootDemoBackends(count, antibotIndex)`** — spawns one demo backend per shard on ports `3101+index`, waits for `GET /` → 200, returns a cleanup function that kills every child. Enforces `BACKEND_DEMO_SHARD_LIMIT` when the paired backend pre-provisions a fixed DB set.
- **`SHARD_STAGGER_MS` (4000 ms)** — each shard's `cypress run` is delayed by `index × 4 s` so the first process warms Cypress's bundle cache before the others read it, preventing cold-cache truncation failures.
- **Live-profile guard** — exits 2 immediately if `CYPRESS_liveProfile === 'true'` because all shards would share one real Mongo.
- **`.env` loading** — `process.loadEnvFile()` in a try/catch; CI (no `.env`) is the normal case.
- **Log directory** — failing shards dump full output to `reports/e2e/` for CI upload.

## Relationships

| Neighbor | Interaction |
|---|---|
| `scripts/pairing/paired-backend-path.ts` | Provides `resolveBackendDemoCommand` (the actual `npm run demo` / `composer demo` invocation) and `resolveBackendDemoShardLimit` (max pre-provisioned DBs). |
| `scripts/demo/scratch-directory.ts` | Provides `createDemoScratchDirectory` / `removeDemoScratchDirectory` used to give each backend an isolated temp working directory. |
| `scripts/e2e/cypress-spec-globs.ts` | Supplies `FUNCTIONAL_SPEC_GLOBS` and `ANTIBOT_SPEC_GLOBS` that drive spec discovery. |
| `scripts/e2e/shard-balancer.ts` | Supplies `weighSpecs`, `balanceShards`, and the `SECONDS` fallback duration table. |
| `scripts/e2e/spec-durations.ts` | Supplies `readSpecDurations()` — the per-run recorded durations that override the static table. |
| `scripts/e2e/webhook-sink.ts` | Supplies `SHARD_SINK_PORT_BASE` and `sinkUrlForPort` so each backend's env points at its shard's own sink listener. |
| `scripts/e2e/antibot-backend.ts` | Supplies `ANTIBOT_BACKEND_ENV` (challenge-provider flags) injected only into the antibot shard's backend. |
| `scripts/e2e/flaky-report.ts` | Supplies `resetFlakyReport` (called before the run) and `printFlakyReport` (called after) to aggregate flaky counts across shards. |
| `tests/unit/scripts/e2e/cypress-spec-globs.spec.ts` | Unit-tests the glob constants this script depends on; a regression there silently breaks spec discovery here. |

## Notes

- **Must target a built bundle, not a dev server.** `vite preview` serves static files; `vite dev` compiles on first request, and concurrent browsers land in the compile queue inside Cypress timeouts, surfacing as random flakes. The file header records the measurement (4/4 green in 153 s built vs. 2 failures in 2-of-3 runs on dev).
- **Keying specs by full relative path, not basename.** Every module ships its own `a11y.cy.ts`; a basename key would look up the same duration for all of them.
- **The zero-spec guard is intentional and loud.** An empty glob match (e.g. `REPO_ROOT` resolving one level too shallow) would otherwise produce four "green" shards with zero tests. The script exits 2 rather than letting the gate pass.
- **Stagger is a cache-warmth fix, not a rate-limit.** It only costs time on a cold cache (first sharded run after a support-file edit) and is free on warm runs. Removing it reintroduces `Unexpected end of input` / `cy.restore is not a function` failures.
- **The live profile is a hard refusal, not a warning.** `test:e2e:live` is deliberately sequential; this script will not shard it under any env combination.
- **`process.loadEnvFile()` is Node ≥ 20.12.** The `catch` swallows the error so CI checkouts without a `.env` file don't crash.
- **Port allocation:** backends on `3101+index`, webhook sinks on `SHARD_SINK_PORT_BASE+index`. An orphaned backend holding its port will cause `EADDRINUSE` on the *next* run; the cleanup function returned by `bootDemoBackends` must be called on every exit path.
