---
source: scripts/lighthouse/build.ts
sha256: 20bd9fc98ea01dab1d2bfe35918d6755139596f4e3fb806494ace95bd22b0974
signature: 676a5f3a4359690e18dd1c9dc867cd865c2a304612af6731aed0861a55017f76
generated_at: 2026-11-10T02:42:09.940409+00:00
model: ollama:qwen3.8:27b
---

# scripts/lighthouse/build.ts

## Purpose

Builds the exact production artifacts that Lighthouse will audit: a `vite` production build into `dist-lighthouse`, followed by the same Docker entrypoint generator scripts that write `config.js`, `security.txt`, `robots.txt`, etc. Using the real generators guarantees no second copy of key whitelists exists and that Lighthouse measures what production actually serves. A dedicated build (rather than `build:e2e`) is used because `build:e2e` enables response validation, which Lighthouse would count as app cost.

## Key elements

- **Vite build invocation** — Runs `node_modules/.bin/vite build --outDir <AUDIT_BUILD_DIR>` synchronously via `execFileSync`, with the audit environment merged in.
- **Nginx scratch directory** — Creates a temp folder (`mkdtempSync` under `os.tmpdir()`) to stand in for the real nginx config dir; no nginx process exists in this context.
- **Generator loop** — Iterates over `generatorScripts('docker/docker-entrypoint.d')`, executing each with `sh` and passing `NGINX_HTML_ROOT=AUDIT_BUILD_DIR` and `NGINX_CONF_DIR=<temp dir>` so generators write their output into the build directory Lighthouse will serve.
- **Environment setup** — Merges `process.env` with the result of `auditEnvironment(ANALYTICS_SINK_PORT)` to form the env passed to every child process.

## Relationships

- **`scripts/lighthouse/audit-environment.ts`** — Provides `AUDIT_BUILD_DIR` (the output directory constant), `auditEnvironment()` (constructs the audit-specific env vars), and `generatorScripts()` (returns the list of Docker entrypoint generator script paths to run).
- **`scripts/lighthouse/analytics-sink.ts`** — Provides `ANALYTICS_SINK_PORT`, which is forwarded into `auditEnvironment()` so the built config points at the correct analytics sink.

## Notes

- The script is invoked directly via the `tsx` shebang; it is not imported by other modules.
- All child processes use `stdio: 'inherit'`, so output streams to the caller's terminal.
- The nginx config temp directory is discarded after the script exits; only the files written into `AUDIT_BUILD_DIR` (the "HTML root") matter for the subsequent audit.
- See `docs/tools/lighthouse.md` for the broader tooling rationale.
