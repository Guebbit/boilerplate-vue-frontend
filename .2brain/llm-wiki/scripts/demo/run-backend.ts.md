---
source: scripts/demo/run-backend.ts
sha256: ead8f95d88019b5579efa761040149fc9be68bfb1b3bf13dde0a927fcd90d592
signature: ca6167fc7701cfe69b430741a0a4c6fb79f89b9c6375abf7e7da9b88a5ac2eec
generated_at: 2026-11-10T02:29:18.148936+00:00
model: ollama:qwen3.8:27b
---

# scripts/demo/run-backend.ts

## Purpose

Thin exec wrapper that boots the paired backend's demo profile as `npm run backend:demo`. It exists because `start-server-and-test` (and a human) need a single, already-resolved command to spawn a backend, while the actual command to run is owned by `BACKEND_DEMO_COMMAND` (which may differ between the two paired backends). It also manages a scratch directory for the backend's in-memory Mongo and forwards lifecycle signals so cleanup runs.

## Key elements

- **`SINGLE_PROCESS_DEMO_PORT`** (3100) — the fixed port every single-process e2e script (serial, visual, dev, spec) uses for its throwaway backend. Deliberately not :3000 (conventional dev port) and below the sharded pool base (3101+).
- **`boot(argv)`** — creates a scratch directory, spawns the backend command with a curated `env` (pinned ports, frontend URL, webhook-sink URL, optional antibot flag), forwards SIGTERM/SIGINT to the child, and mirrors the child's exit code on close.
- **Idle path** — when `resolveBackendDemoCommand()` returns nothing (no `BACKEND_DEMO_COMMAND`), the script logs a message and idles indefinitely so `start-server-and-test` treats it as "server alive" rather than "server crashed."
- **`process.loadEnvFile()`** — loads `.env` into `process.env` before command resolution; a missing file is silently ignored (CI passes the variable directly).

## Relationships

- **`scripts/pairing/paired-backend-path.ts`** — imports `resolveBackendDemoCommand()`; this is the single source of truth for *which* backend to boot, shared with `check-spec-identity` so the two can never disagree.
- **`scripts/demo/scratch-directory.ts`** — imports `createDemoScratchDirectory` / `removeDemoScratchDirectory` to give the in-memory Mongo a dedicated tmpdir instead of polluting the machine's `/tmp`.
- **`scripts/e2e/antibot-backend.ts`** — imports `wantsAntibotBackend` and `ANTIBOT_BACKEND_ENV`; the `--antibot` flag on the CLI enables the human-challenge provider env vars.
- **`scripts/e2e/webhook-sink.ts`** — imports `SINGLE_PROCESS_SINK_PORT` and `sinkUrlForPort` to wire the backend's `NODE_WEBHOOK_DEMO_SINK_URL` to the Cypress-hosted sink.

## Notes

- **Idling is load-bearing.** If `BACKEND_DEMO_COMMAND` is unset the script must *not* exit; `start-server-and-test` reads an immediate exit as "server died" and aborts before ever probing the backend someone already has running.
- **`NODE_FRONTEND_URL` is hardcoded to :8085**, matching `cypress.config.ts`'s `baseUrl`, not the backend's own `.env` default of :8080. Without this, OAuth callbacks and emailed links redirect to a port nothing is listening on.
- **Both `NODE_PORT` and `SERVER_PORT` are set** to 3100 — the former for the Node twin's `demo` script, the latter for Laravel's `artisan serve`. This mirrors what `run-shards.ts` already does for the sharded case.
- **`NODE_DEMO=true`** is set for symmetry with `run-shards.ts`'s per-shard backends; nothing in this file reads it.
