# scripts/run-backend-demo.ts

## Purpose
A thin CLI wrapper behind `npm run backend:demo`. It resolves *which* paired backend to boot (delegating to `resolveBackendDemoCommand`), loads `.env`, spawns the backend's demo-profile process with a dedicated scratch directory, and forwards lifecycle signals. It exists so that `start-server-and-test` and a human each get one command with the sibling-checkout path already resolved.

## Key elements
- **Top-level `process.loadEnvFile()` (best-effort)** — populates `process.env` from a local `.env` before the command is resolved; missing file is silently ignored (CI passes the variable directly).
- **`boot(argv)`** — creates a scratch directory, `spawn`s the backend with `stdio: 'inherit'` and a `TMPDIR` override, forwards `SIGTERM`/`SIGINT` to the child, removes the scratch directory on close, and exits with the child's code (defaulting to 1).
- **`resolveBackendDemoCommand()`** *(imported)* — returns the argv array to spawn, or `null`/`undefined` when `BACKEND_DEMO_COMMAND` is unset.
- **`createDemoScratchDirectory` / `removeDemoScratchDirectory`** *(imported)* — allocate and clean up a tmpfs-backed directory so the backend's in-memory Mongo does not fill the machine's `/tmp`.
- **Idle fallback** — when no demo command is resolved, the script logs a message and starts a 60 s `setInterval` to keep the process alive, so `start-server-and-test` does not interpret an immediate exit as a dead server.

## Relationships
- **`scripts/paired-backend-path.ts`** — provides `resolveBackendDemoCommand`, which performs the sibling-checkout resolution (the same logic `check-spec-identity` uses) to pick the correct paired backend and its demo-profile runner.
- **`scripts/backend-demo-scratch-directory.ts`** — provides the scratch-directory create/remove helpers that give the spawned backend a dedicated `TMPDIR` under a tmpfs mount.

## Notes
- **No `BACKEND_DEMO_COMMAND` → no boot, but the process stays alive.** The idle `setInterval` is deliberate: `start-server-and-test` treats a start command that exits as a crashed server and aborts before waiting on an externally-managed backend.
- **`process.exit(code ?? 1)`** in the close handler is intentional (eslint-suppressed): in a `child.on('close')` callback there is no caller to return to, so the exit code *is* the interface.
- **Signal forwarding covers only `SIGTERM` and `SIGINT`.** A `SIGKILL` to the wrapper will orphan the child.
- The two paired backends do not share the same demo-profile runner; which command to run is entirely controlled by `BACKEND_DEMO_COMMAND`.
