---
source: scripts/demo/run-backend.ts
sha256: ead8f95d88019b5579efa761040149fc9be68bfb1b3bf13dde0a927fcd90d592
generated_at: 2026-10-16T23:59:17.504804+00:00
model: ollama:qwen3.8:27b
---

# scripts/demo/run-backend.ts

## Purpose

Thin CLI wrapper (`npm run backend:demo`) that spawns the paired backend's demo profile for **single-process** e2e runs (serial, visual, dev, spec). It resolves *which* backend to start via the same pairing logic as the test suite, picks the correct start command from `BACKEND_DEMO_COMMAND`, and hands a ready process to `start-server-and-test`'s readiness probe. Without it, the suite would need to resolve path, command, port, and env itself.

## Key elements

- **`SINGLE_PROCESS_DEMO_PORT`** (exported, `3100`) — fixed port for all non-sharded e2e demo backends. Chosen to avoid :3000 (conventional dev port) and to stay below `run-shards.ts`'s `DEMO_PORT_BASE` (3101+) so the two schemes cannot collide.
- **`boot(argv)`** (private) — creates a scratch directory, spawns the backend command with a pinned set of env vars (`NODE_PORT`, `SERVER_PORT`, `NODE_FRONTEND_URL`, `NODE_DEMO`, `NODE_WEBHOOK_DEMO_SINK_URL`, optional antibot env), forwards SIGTERM/SIGINT to the child, mirrors the child's exit code, and cleans up the scratch directory on close.
- **Idle branch** — when `BACKEND_DEMO_COMMAND` is unset the script does *not* exit; it logs a message and idles via `setInterval` so `start-server-and-test`'s start-process stays alive while it waits on an externally-started backend.
- **`process.loadEnvFile()`** (top-level) — loads `.env` into `process.env` before command resolution, since npm scripts do not auto-load it. A missing file is silently ignored (CI passes the variable explicitly).

## Relationships

- **`scripts/pairing/paired-backend-path.ts`** — calls `resolveBackendDemoCommand()` to determine *which* paired backend and *which* npm/artisan command to run. This is the single source of truth shared with the test suite's identity check.
- **`scripts/demo/scratch-directory.ts`** — calls `createDemoScratchDirectory()` / `removeDemoScratchDirectory()` to give the backend a dedicated tmpfs-backed directory instead of the machine's `/tmp`.
- **`scripts/e2e/antibot-backend.ts`** — imports `wantsAntibotBackend()` (checks for `--antibot` in argv) and `ANTIBOT_BACKEND_ENV` (the env bag that enables the human-challenge provider).
- **`scripts/e2e/webhook-sink.ts`** — imports `SINGLE_PROCESS_SINK_PORT` and `sinkUrlForPort()` to set `NODE_WEBHOOK_DEMO_SINK_URL`, pointing the seeded subscription and SSRF exemption at the same sink Cypress hosts.

## Notes

- The port is **always 3100**, regardless of `NODE_PORT` or the backend's own `.env`. The readiness probe is a bare `GET` and cannot tell this backend apart from an unrelated process on :3000; a wrong first-responder makes the whole suite silently target an unseeded backend.
- `NODE_FRONTEND_URL` is hard-coded to `http://localhost:8085` (Cypress's `baseUrl`), overriding the backend's own `:8080` default so OAuth callbacks and emailed links hit the right server.
- The idle branch is intentional: `start-server-and-test` treats a start-command that exits immediately as a crashed server and aborts. The `setInterval` keeps the process alive so the wait either succeeds (external backend is up) or times out with a clear message.
- `process.exit(code ?? 1)` in the close handler is the only path out when a command *was* configured; the `// eslint-disable` comment documents why throwing is not an option there.
