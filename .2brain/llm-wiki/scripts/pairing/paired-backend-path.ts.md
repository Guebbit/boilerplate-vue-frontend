---
source: scripts/pairing/paired-backend-path.ts
sha256: 78ef5291b8fbb02da7914d0bda2046f09f18d60810f1db1084db8e0d4bc3f804
signature: 70de04bda5e847cbf0f1670a61c0e6d7fd813f00513403c4e31755726279b63c
generated_at: 2026-11-10T02:46:51.302338+00:00
model: ollama:qwen3.8:27b
---

# scripts/pairing/paired-backend-path.ts

## Purpose

Centralizes how this repo locates and drives its paired backend checkout: resolving the backend's absolute path, the command to reset its database between live specs, the command to boot its demo profile, and the ceiling on concurrent demo backends. It exists so that every caller (Cypress config, shard runner, demo runner, spec-identity checker) derives the same answer from the same precedence rules and can never silently point at different backends.

## Key elements

- **`DEFAULT_BACKEND_PATH`** (`../boilerplate-node-backend`) — fallback sibling-checkout location used when neither the environment nor `.env` overrides it.
- **`backendPathFromEnvironmentFile()`** (internal) — reads `BACKEND_PATH` from `./.env` via `node:util` `parseEnv`; returns `undefined` when the file is absent.
- **`resolveBackendPath()`** — returns the absolute backend path. Precedence: `process.env.BACKEND_PATH` → `.env` `BACKEND_PATH` → `DEFAULT_BACKEND_PATH`. Empty strings are treated as unset.
- **`LIVE_SCENARIO_FILE`** (`reports/e2e/scenario.json`) — where the live-profile reset writes its seed description and where `cy.scenario()` reads it back.
- **`resolveLiveResetCommand()`** — resolves the `LIVE_RESET_COMMAND` env var, substituting `{backend}` and `{describeTo}` placeholders; returns `undefined` if unset.
- **`resolveBackendDemoCommand()`** — resolves `BACKEND_DEMO_COMMAND` into a `readonly string[]` argv (split on whitespace, no shell); returns `undefined` if unset.
- **`resolveBackendDemoShardLimit()`** — reads `BACKEND_DEMO_SHARD_LIMIT` as a positive integer; returns `undefined` for any non-positive-integer or unset value.

## Relationships

- **`cypress.config.ts`** — calls `resolveBackendPath()` to build the `npm --prefix …` argument passed to the backend for the reset step, and consumes `resolveLiveResetCommand()` for the reset command.
- **`scripts/pairing/check-spec-identity.ts`** — calls `resolveBackendPath()` to locate the backend checkout whose spec files it compares against.
- **`scripts/demo/run-backend.ts`** — calls `resolveBackendDemoCommand()` to obtain the argv for spawning the paired backend's demo profile.
- **`scripts/e2e/run-shards.ts`** — calls `resolveBackendDemoShardLimit()` to cap the number of concurrent demo backends it launches.
- **`scripts/docs/check-references.ts`** — validates that documentation references to this module's exports remain accurate.
- **`tests/unit/scripts/pairing/paired-backend-path.spec.ts`** — unit-tests the resolution logic, placeholder substitution, and empty-string handling.

## Notes

- **Empty string ≠ set.** Every `.env` copied from `.env-example` defines variables with empty values. The code deliberately uses `||` (falsy check) rather than `??` so that `''` falls through to the next source. A bare `??` would resolve `path.resolve(cwd, '')` to the repo's own root, producing a confusing "backend missing" instead of "backend not configured."
- **No shell in the demo command.** `resolveBackendDemoCommand()` splits on whitespace and returns an argv array. Callers spawn the process directly (`stdio: 'inherit'`, kill-by-signal); an intervening shell would absorb the signal instead of the server.
- **`parseEnv` over `loadEnvFile`.** The module reads only `BACKEND_PATH` from `.env` so that no other variables leak into the environment of whatever child process is spawned next.
- **Backend-agnostic by design.** Nothing here inspects *which* backend is on the other end. All backend-specific commands arrive through `.env` variables, keeping pairing rules out of this repo's source.
