# scripts/run-backend-demo.ts

## Purpose

A thin CLI wrapper (`npm run backend:demo`) that boots the paired backend's demo profile. It resolves *which* backend to start (delegating to `paired-backend-path.ts` so the choice can't diverge from `check-spec-identity`), sets up the runtime environment (scratch dir, frontend URL), spawns the backend process, and forwards signals so it shuts down cleanly. When no demo command is configured it idles so `start-server-and-test` still sees a "live" server.

## Key elements

- **`.env` load** (top-level) — calls `process.loadEnvFile()` in a try/catch so `BACKEND_DEMO_COMMAND` (and other vars) are visible before `resolveBackendDemoCommand()` runs. A missing `.env` is tolerated (CI passes the var directly).
- **`boot(argv)`** — the single worker. Creates a scratch directory, `spawn`s the resolved command with `stdio: 'inherit'`, injects `TMPDIR` and `NODE_FRONTEND_URL` into the child env, forwards `SIGTERM`/`SIGINT` to the child, and on `close` removes the scratch directory and exits with the child's code.
- **Idle branch** — when `resolveBackendDemoCommand()` returns nothing, logs a message and runs an infinite `setInterval` so the process never exits (required by `start-server-and-test`'s "is the server alive?" check).
- **`demoCommand`** — the resolved `[command, ...args]` array passed to `boot`.

## Relationships

- **`scripts/paired-backend-path.ts`** — provides `resolveBackendDemoCommand()`, which decides *which* paired backend to boot and *what* command to run (driven by the `BACKEND_DEMO_COMMAND` env var and the sibling-checkout resolution logic shared with `check-spec-identity`).
- **`scripts/backend-demo-scratch-directory.ts`** — provides `createDemoScratchDirectory()` / `removeDemoScratchDirectory()`, used to give the backend's in-memory Mongo a dedicated writable location (on tmpfs) instead of the machine's `/tmp`.

## Notes

- `NODE_FRONTEND_URL` is hardcoded to `http://localhost:8085` in the child env, overriding the backend's own `.env` default of `:8080`. This matches the e2e/Cypress `baseUrl` so OAuth callbacks and emailed links point at the right port.
- Without `BACKEND_DEMO_COMMAND` set the script does **not** fail; it idles. `start-server-and-test` treats a quick exit as "server crashed" and would abort the suite.
- The exit code is propagated via `process.exit()` (eslint-suppressed) because the wrapper's exit status *is* the interface for the calling npm script.
- This file is intentionally not a module — it runs as a script, not as imported library code.
