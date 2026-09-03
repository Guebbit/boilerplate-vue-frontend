# scripts/run-e2e-shards.ts

## Purpose

Orchestrates the sharded parallel execution of Cypress e2e specs (the worker behind `npm run test:e2e`). Splits functional specs across N parallel `cypress run` processes, each backed by its own in-memory demo backend, while sharing a single `vite preview` static server. Exists to cut wall-clock time from ~13 min (sequential) to ~85 s floor (bounded by the longest single spec) without the flakiness a dev server would introduce.

## Key elements

- **Live-profile guard** — exits with code 2 if `CYPRESS_liveProfile === 'true'`, preventing `cy.resetState()` from racing against a shared real database.
- **`positiveInteger`** — parses an env string to a positive integer or returns `undefined` (used for `E2E_SHARDS`, default 4).
- **`specs`** — result of `globSync(FUNCTIONAL_SPEC_GLOBS)` mapped to `{ file, key }`; sorted for deterministic shard assignment.
- **`weighted` / `shards`** — specs weighted by measured durations (`SECONDS`), then balanced via LPT (`balanceShards`).
- **`SHARD_STAGGER_MS`** (4000) — sequential delay between spawning each Cypress process so the first populates the bundle cache before the others read it; prevents cold-cache "truncated bundle" / "cy.resetState is not a function" failures.
- **`bootDemoBackends(count)`** — spawns `count` backend processes (one per shard) on ports `DEMO_PORT_BASE + i` (3101+), waits for `GET /` → 200, and returns a cleanup callback that kills the entire process group (`kill(-pid)`) and removes the scratch directory. Registered on `process.on('exit')` and `process.on('SIGINT/SIGTERM')`.
- **`LOG_DIR`** (`reports/e2e/`) — per-shard full stdout/stderr persisted here on failure for CI upload.
- **`DEMO_PORT_BASE`** (3101) — first port for per-shard backends.

## Relationships

- **`scripts/e2e-shard-balancer.ts`** — imports `SECONDS` (measured per-spec durations), `weighSpecs`, and `balanceShards`; all balancing logic lives there, this file only calls it.
- **`scripts/cypress-spec-globs.ts`** — imports `FUNCTIONAL_SPEC_GLOBS`, the glob pattern(s) that determine which spec files are sharded. Adding a new spec module requires no edit to this file.
- **`scripts/paired-backend-path.ts`** — imports `resolveBackendDemoCommand()`, which returns the `[command, ...args]` tuple to spawn the paired backend's demo script (or `undefined` when no pairing exists).
- **`scripts/backend-demo-scratch-directory.ts`** — imports `createDemoScratchDirectory()` / `removeDemoScratchDirectory()` to redirect in-memory Mongo temp files off the system `/tmp`.
- **`tests/unit/scripts/cypress-spec-globs.spec.ts`** — unit-tests the glob patterns consumed here; changes to `FUNCTIONAL_SPEC_GLOBS` are validated there before reaching this script.

## Notes

- **PHP pairing ceiling:** `02-e2e-demo-shards.sql` in the PHP repo provisions exactly 4 databases (`e2e_demo_shard_1..4`). This script throws early if `E2E_SHARDS > 4` when the resolved command is `composer`, pointing to that file. The Node twin (in-memory Mongo) has no such ceiling.
- **`detached: true` + negative-pid kill:** each backend is spawned in its own process group so `process.kill(-pid, 'SIGTERM')` reaches the full chain (e.g. `npm → tsx → node → mongod`). Without this, orphaned grandchildren hold the port and the *next* run fails with `EADDRINUSE`.
- **Stagger is intentional and non-obvious:** the 4 s delay is not a retry or timeout; it exists solely so the first `cypress run` finishes bundling before the others start reading. On a warm cache it costs nothing perceptible; on a cold one it prevents a load-time failure that looks like a real bug.
- **`BACKEND_DEMO_COMMAND` unset** means "backends are already running externally"; the script still waits for readiness on each port so a missing backend fails at the readiness check (with a clear message) rather than deep inside Cypress.
- **`NODE_FRONTEND_URL`** is hardcoded to `http://localhost:8085` (the preview server) so OAuth callbacks and emailed links redirect correctly regardless of the Node twin's `.env` default.
