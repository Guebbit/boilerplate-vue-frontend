# scripts/run-e2e-shards.ts

## Purpose

The worker behind `npm run test:e2e`. It splits the functional Cypress spec suite into parallel shards (default 4) balanced by measured durations, boots one isolated demo backend per shard, staggers the `cypress run` launches, and collects pass/fail per shard — all against a single **built** (not dev) preview server so that shard count doesn't introduce compile-contention flakes.

## Key elements

- **Live-profile guard** — exits with code 2 (and a human-readable explanation) when `CYPRESS_liveProfile === 'true'`, because `cy.resetState()` would re-seed one shared real DB out from under the other shards.
- **`positiveInteger(value)`** — parses an env-var string into a positive integer or returns `undefined`.
- **`shardCount`** — read from `E2E_SHARDS`, defaults to 4.
- **`specs`** — obtained via `globSync(FUNCTIONAL_SPEC_GLOBS)`, normalised to posix separators, sorted, and mapped to `{ file, key }` pairs. New spec files are picked up automatically.
- **`weighted` / `shards`** — produced by `weighSpecs` (applies measured seconds from `SECONDS`) and `balanceShards` (longest-processor-time onto least-loaded shard).
- **`SHARD_STAGGER_MS`** (4000 ms) — delay between consecutive `cypress run` spawns so the first process warms the bundle cache before the others read it, avoiding cold-cache truncation failures.
- **`DEMO_PORT_BASE`** (3101) — shard *n* listens on `3101 + n`.
- **`bootDemoBackends(count)`** — spawns one backend per shard (via `resolveBackendDemoCommand()`), sets per-shard env (`NODE_PORT`, `SERVER_PORT`, `DB_DATABASE=e2e_demo_shard_{n}`, `TMPDIR`), polls `GET /` for readiness, and registers a `kill` cleanup that signals the entire process group (negative PID) and removes the scratch directory. Registered on `exit`, `SIGINT`, and `SIGTERM`.
- **`LOG_DIR`** (`reports/e2e/`) — destination for a failing shard's full stdout+stderr so CI can upload it.
- **PHP-pairing guard** — throws if `E2E_SHARDS > 4` when the demo command is `composer`, because the PHP repo only provisions four `e2e_demo_shard_*` databases.

## Relationships

- **`scripts/paired-backend-path.ts`** — provides `resolveBackendDemoCommand()`, the actual command (and args) to boot the paired backend. Returns `undefined` when no pairing is configured, in which case this script expects backends to already be listening.
- **`scripts/backend-demo-scratch-directory.ts`** — provides `createDemoScratchDirectory()` / `removeDemoScratchDirectory()` to give each in-memory Mongo a dedicated `TMPDIR` outside the machine's `/tmp` (avoids filling tmpfs) and to clean it up on shutdown.
- **`scripts/cypress-spec-globs.ts`** — exports `FUNCTIONAL_SPEC_GLOBS`, the glob patterns this script uses to discover the spec files to shard.
- **`scripts/e2e-shard-balancer.ts`** — exports `SECONDS` (measured per-spec durations), `weighSpecs()`, and `balanceShards()` (the LPT algorithm). This script is the consumer; the balancer is pure logic with no I/O.
- **`tests/unit/scripts/cypress-spec-globs.spec.ts`** — unit-tests the glob patterns that feed into this script's `specs` list; does not import this file directly.

## Notes

- **Built bundle only.** The doc-block and comments explain why a dev server (`vite dev`) is unsafe: on-demand route compilation under 4 concurrent browsers lands inside Cypress timeouts and reads as a random flake. `vite preview` (static) eliminates that class of failure entirely.
- **Cleanup is process-group-level.** Each backend is spawned with `detached: true`; the kill uses `process.kill(-pid, 'SIGTERM')` to signal the whole chain (npm → tsx → node → mongod, or composer → php → artisan). Killing only the wrapper orphans grandchildren that then hold the port and break the *next* run with `EADDRINUSE`.
- **Stagger is a cache-warming workaround, not a timing tweak.** It exists specifically because concurrent cold-cache Cypress bundling has been observed to produce truncated bundles (`Unexpected end of input`) or a missing `cy.resetState` command. On a warm cache the cost is zero.
- **PHP shard ceiling is structural, not configurable.** The four `e2e_demo_shard_*` databases are created by a SQL file in the PHP repo. Raising `E2E_SHARDS` above 4 against the PHP pairing will fail at Laravel's DB connection with no useful error unless you add the corresponding `CREATE DATABASE`/`GRANT` blocks first.
- **The file is truncated in this wiki snapshot.** The readiness-polling loop, the actual staggered `cypress run` spawning, per-shard result collection, and the final exit-code logic follow the `bootDemoBackends` definition but are not shown above.
