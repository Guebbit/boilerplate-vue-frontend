---
source: scripts/demo/run-backend.ts
sha256: f3ea263787cf027a5593e0425e714c956cf30ccfca3d88e3cd3278e9d5b7d2c0
generated_at: 2026-10-02T11:31:35.065379+00:00
model: ollama:qwen3.8:27b
---

# scripts/demo/run-backend.ts

## Purpose

A thin `spawn` wrapper behind the `npm run backend:demo` script. It resolves which paired backend to run (via `resolveBackendDemoCommand`), assembles the environment a throwaway demo instance needs, and launches it so that `start-server-and-test` (or a human) gets a single ready-to-execute command. It also handles the "no command configured" case by idling so `start-server-and-test` doesn't interpret a clean exit as a crashed server.

## Key elements

- **`SINGLE_PROCESS_DEMO_PORT`** (exported, `3100`) — the fixed port every single-process e2e npm script uses for its demo backend. Deliberately avoids `:3000` (conventional dev port) and stays below `run-shards.ts`'s `DEMO_PORT_BASE` (3101+) to prevent collisions.
- **`boot(argv)`** (module-local) — creates a scratch directory for the backend's in-memory Mongo, `spawn`s the command with `stdio: 'inherit'` and a curated `env` (port, frontend URL, webhook-sink URL, optional antibot env), forwards `SIGTERM`/`SIGINT` to the child, and cleans up the scratch directory on close.
- **Top-level block** — calls `resolveBackendDemoCommand()`; if it returns a command, calls `boot()`; if unset, logs a message and enters an infinite `setInterval` loop so the process stays alive for `start-server-and-test`'s readiness wait.
- **`.env` preload** — calls `process.loadEnvFile()` (swallowing the error if no `.env` exists) so `BACKEND_DEMO_COMMAND` from a developer's `.env` is visible to the resolution logic.

## Relationships

- **`scripts/pairing/paired-backend-path.ts`** — imports `resolveBackendDemoCommand` to determine *which* backend (Node or Laravel) and *what* command to execute. This is the same resolution `check-spec-identity` uses, guaranteeing the two can't disagree.
- **`scripts/demo/scratch-directory.ts`** — imports `createDemoScratchDirectory` / `removeDemoScratchDirectory` to give the backend's in-memory Mongo a dedicated tmpfs-backed directory instead of the machine's `/tmp`.
- **`scripts/e2e/antibot-backend.ts`** — imports `wantsAntibotBackend` (checks for `--antibot` in `process.argv`) and `ANTIBOT_BACKEND_ENV` (env bag to enable the human-challenge provider when that flag is present).
- **`scripts/e2e/webhook-sink.ts`** — imports `SINGLE_PROCESS_SINK_PORT` and `sinkUrlForPort` to set `NODE_WEBHOOK_DEMO_SINK_URL`, pointing the seeded subscription and SSRF-exempt host at the sink Cypress runs beside the backend.

## Notes

- **Port is hard-pinned, not inherited.** `NODE_PORT` and `SERVER_PORT` are both forced to `SINGLE_PROCESS_DEMO_PORT` in the spawned env, regardless of what the caller's shell or `.env` sets. This prevents `start-server-and-test`'s bare-`GET` readiness probe from hitting an unrelated server already listening on `:3000`.
- **Unset `BACKEND_DEMO_COMMAND` is not an error.** The script idles indefinitely (60 s interval) rather than exiting, because `start-server-and-test` treats a start-command exit as "server died" and aborts the suite.
- **`NODE_FRONTEND_URL` is always `http://localhost:8085`**, matching `cypress.config.ts`'s `baseUrl`, not the backend's own `.env` default of `:8080`.
- **`NODE_DEMO=true`** is set for symmetry with `run-shards.ts`; nothing in this file reads it.
- The file uses `process.exit` in the `close` handler (with an eslint-disable) because it's a CLI wrapper whose exit code *is* its interface.
