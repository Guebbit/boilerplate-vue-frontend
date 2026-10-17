---
source: docker/docker-entrypoint.d/40-generate-runtime-config.sh
sha256: 4fd51a23a28017903a7696a011b82b6efe8caa28346167c01ad401113df718c2
generated_at: 2026-10-16T23:56:17.077245+00:00
model: ollama:qwen3.8:27b
---

# docker/docker-entrypoint.d/40-generate-runtime-config.sh

## Purpose

Generates `/usr/share/nginx/html/config.js` from the container's environment variables at every startup, so a config change is a restart rather than a rebuild. It is auto-sourced by the official nginx image's entrypoint, which executes every `*.sh` under `/docker-entrypoint.d/` before starting nginx.

## Key elements

- **`json_escape()`** – Escapes backslashes and double-quotes in a value, then strips all control characters (`\000`–`\037`, including newlines) so a malformed env var can't break the generated JS.
- **`config_entry()`** – Emits one `"key": "value",` line if the value is non-empty; emits nothing if unset or blank, leaving the key absent (i.e. `undefined`) to the reader.
- **Main block (lines writing `window.__APP_CONFIG`)** – Calls `config_entry` for 20 `VITE_*` environment variables (API URLs, app identity, locale, logging, upload limits, Faro telemetry, Umami analytics, etc.) and writes the result to `CONFIG_FILE`.
- **`CONFIG_FILE`** – Hardcoded to `/usr/share/nginx/html/config.js`, the path `index.html` loads before the app bundle.

## Relationships

No graph-neighbor edges are recorded. The script itself references:

- **`src/infrastructure/runtime-config.ts`** – The sole reader of `window.__APP_CONFIG`; this script is its writer.
- **`index.html`** – Loads `config.js` before the compiled app bundle, so the object must exist at page-load time.
- **`docs/tools/environment.md`** – Documents the design, whitelist, and "Runtime configuration" section governing which env vars are exposed here.

## Notes

- **Trailing comma is intentional.** Every `config_entry` call ends with `,`, including the last. A trailing comma in a JS object literal is valid, so no special-casing is needed for "the final key."
- **Never a secret.** Every value already ships to the browser via the compiled bundle; this script only makes them overridable per-deployment.
- **POSIX sh, not bash.** The shebang is `#!/bin/sh` and `set -eu` is used; avoid bashisms if editing.
- **The `40-` prefix** is an ordering convention: the nginx entrypoint sources files in lexical order, and this number was chosen to run after any earlier setup scripts but before nginx starts.
- **`config_entry` silently drops blank values.** An unset *or* empty-string env var produces no key at all, which the reader treats identically to a missing `config.js`.
