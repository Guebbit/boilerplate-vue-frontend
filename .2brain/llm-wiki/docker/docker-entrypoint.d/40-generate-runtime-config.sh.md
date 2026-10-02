---
source: docker/docker-entrypoint.d/40-generate-runtime-config.sh
sha256: 5f909679e736315b93340dd854b802dfd52cc2590d2c84c7ec69145bffbcc950
generated_at: 2026-10-02T14:32:38.967803+00:00
model: ollama:qwen3.8:27b
---

# docker/docker-entrypoint.d/40-generate-runtime-config.sh

## Purpose

Generates `/usr/share/nginx/html/config.js` at every container start by reading `VITE_*` environment variables and emitting them as a `window.__APP_CONFIG` JS object literal. This makes a config change a simple restart (new env → new file) rather than a full image rebuild. It runs automatically because the official nginx image sources every executable `*.sh` under `/docker-entrypoint.d/` before launching the server.

## Key elements

- **`json_escape(value)`** — escapes backslashes and double-quotes, then strips all C0 control characters (newlines, tabs, etc.) so an operator-supplied env var cannot break the generated script.
- **`config_entry(key, value)`** — prints a `"key": "value",` line if `value` is non-empty; prints nothing otherwise (the key is simply absent, equivalent to `undefined` on the reader side).
- **Main block** — opens `window.__APP_CONFIG = {`, calls `config_entry` for each of the ~20 `VITE_*` variables (API URLs, locale settings, logging, Faro, Umami, upload limits, etc.), closes with `};`, and redirects the whole output to `$CONFIG_FILE`.
- **`CONFIG_FILE`** — hardcoded to `/usr/share/nginx/html/config.js`.
- **`set -eu`** — aborts on any error or unset variable.

## Relationships

No graph neighbors are recorded. The script's self-documented consumer is `src/infrastructure/runtime-config.ts` (the sole reader of `window.__APP_CONFIG`); `index.html` loads the generated `config.js` before the app bundle.

## Notes

- **Trailing comma is intentional.** The last real entry always carries one; it is valid JS in an object literal, so no "last-entry" special-casing is needed.
- **Unset or blank vars emit nothing.** A missing key reads as `undefined` in the browser — the same state as if `config.js` were never written.
- **No secrets may appear here.** Every value ships to the browser via the compiled bundle; the design explicitly forbids placing credentials in these env vars (see `FA93` in `FE_AUDIT_0925_6_DEPLOY_AND_TOOLING.md`).
- **The `40-` prefix** controls execution order among sibling entrypoint scripts; it runs after the nginx defaults (`10-`, `20-`) and before any `50-`+ scripts.
