---
source: scripts/pairing/paired-backend-path.ts
sha256: 78ef5291b8fbb02da7914d0bda2046f09f18d60810f1db1084db8e0d4bc3f804
generated_at: 2026-10-02T11:40:40.098599+00:00
model: ollama:qwen3.8:27b
---

# scripts/pairing/paired-backend-path.ts

## Purpose

Shared resolution logic for locating and interacting with the paired backend checkout from the frontend repo. Centralises the `BACKEND_PATH` fallback chain, template-substituted reset/demo commands, and the shard ceiling so that `cypress.config.ts`, the e2e shard runner, the spec-identity checker, and the demo runner all agree on *which* backend they mean without each re-implementing the lookup.

## Key elements

- **`DEFAULT_BACKEND_PATH`** (`'../boilerplate-node-backend'`) — the sibling-checkout directory name used when neither env var nor `.env` file provides an override.
- **`backendPathFromEnvironmentFile()`** (private) — reads `.env` from `cwd` via `parseEnv` (not `loadEnvFile`) so that only `BACKEND_PATH` is extracted without polluting `process.env` for child processes.
- **`resolveBackendPath()`** — returns an absolute path to the backend checkout. Priority: `process.env.BACKEND_PATH` → `.env` file → `DEFAULT_BACKEND_PATH`. Treats empty/whitespace values as unset (avoids the `??`-vs-empty-string pitfall).
- **`LIVE_SCENARIO_FILE`** (`reports/e2e/scenario.json`) — the on-disk location where a live backend writes its seed description (`--describe-to`) and where `cy.scenario()` reads it back.
- **`resolveLiveResetCommand()`** — returns the `LIVE_RESET_COMMAND` string with `{backend}` and `{describeTo}` placeholders substituted, or `undefined` if unset. Used by `cy.restore()`.
- **`resolveBackendDemoCommand()`** — returns `BACKEND_DEMO_COMMAND` (with `{backend}` substituted) split into a `readonly string[]` for `child_process.spawn`, or `undefined`. Deliberately avoids a shell so signals reach the backend directly.
- **`resolveBackendDemoShardLimit()`** — returns `BACKEND_DEMO_SHARD_LIMIT` as a positive integer or `undefined` (unbounded). Non-integer or ≤ 0 values are treated as unset rather than zero.

## Relationships

- **`cypress.config.ts`** — consumes `resolveBackendPath`, `resolveLiveResetCommand`, `LIVE_SCENARIO_FILE`, and `resolveBackendDemoCommand` to configure the live e2e profile (reset between specs, scenario seeding, demo boot).
- **`scripts/pairing/check-spec-identity.ts`** — imports `resolveBackendPath` to locate the backend's spec directory for the identity check.
- **`scripts/e2e/run-shards.ts`** — calls `resolveBackendDemoShardLimit` to cap concurrent demo backends and `resolveBackendDemoCommand` to spawn each one.
- **`scripts/demo/run-backend.ts`** — uses `resolveBackendDemoCommand` to launch the backend demo profile for the dev workflow.
- **`tests/unit/scripts/pairing/paired-backend-path.spec.ts`** — unit-tests the resolution chain, empty-string handling, and template substitution.
- **`tests/cross-cutting/backend-pairing.spec.ts`** — the live e2e spec that `cypress.config.ts` wires to these resolvers.
- **`github/workflows/e2e-live.yml`** — sets `BACKEND_PATH` and `LIVE_RESET_COMMAND` as CI environment variables consumed by `resolveBackendPath` and `resolveLiveResetCommand`.
- **`scripts/docs/check-references.ts`** — references this file's exports when validating that doc links stay in sync.

## Notes

- Empty-string env values are deliberately treated as unset (`?.trim() ||`), not via `??`. This matters because `.env-example` ships `BACKEND_PATH =` (empty) and `.env` files copied from it would otherwise resolve to the frontend's own `cwd`.
- `parseEnv` is used instead of `process.loadEnvFile()` specifically to avoid mutating `process.env` for any child process this module spawns.
- The two paired backends (TypeScript / PHP) expose reset and demo through different runners (npm script vs. `composer`). This file stores only the *command string* from `.env`; no runner detection is performed here.
- `resolveBackendDemoCommand` splits on whitespace rather than invoking a shell, so that SIGTERM/SIGKILL from the test runner kills the backend directly instead of an intermediate shell.
