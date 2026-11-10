---
source: docker/docker-entrypoint.d/40-generate-runtime-config.sh
sha256: 77bbbd1e36e331fb8b0ed35bbc1b1aff905b1fa80e9a910eb3d3d2493b19bc63
signature: 77bbbd1e36e331fb8b0ed35bbc1b1aff905b1fa80e9a910eb3d3d2493b19bc63
generated_at: 2026-11-10T02:15:19.916766+00:00
model: ollama:qwen3.8:27b
---

# docker/docker-entrypoint.d/40-generate-runtime-config.sh

## Purpose
Generates `config.js` (a `window.__APP_CONFIG` object literal) into the web root from `VITE_*` environment variables each time the container starts. This makes runtime configuration a restart, not a rebuild. It runs automatically because the official nginx image sources every executable `*.sh` under `/docker-entrypoint.d/` before launching nginx.

## Key elements
- **`HTML_ROOT` / `CONFIG_FILE`** — Target directory, overridable via `NGINX_HTML_ROOT` (used by the Lighthouse audit build). Defaults to `/usr/share/nginx/html`.
- **`json_escape(value)`** — Escapes backslashes and double-quotes, then strips control characters (U+0000–U+0037) so an operator-supplied env var cannot break the generated JS.
- **`config_entry(key, value)`** — Emits a single `"key": "value",` line, or nothing if the value is unset/blank. An absent key reads as `undefined` on the client side.
- **Main block** — Writes the `window.__APP_CONFIG = { … };` object with 20 properties (API URLs, app name/logo, locales, log level, Axios timeout, upload limit, stock-poll interval, Faro telemetry, Umami analytics, tours toggle). All values come from `VITE_*` env vars with an empty-string default. A trailing comma after every entry (including the last) keeps the JS valid without special-casing.

## Relationships
No graph neighbors are recorded for this file.

## Notes
- **Not a secret channel.** Every value already ships to the browser via the compiled bundle; nothing sensitive should be added here.
- **Blank = absent.** A `VITE_*` var that is empty or unset produces no key in the object; the reader treats that identically to a missing `config.js`.
- **Trailing comma is intentional** and relied upon — do not "fix" it away; the last entry is indistinguishable from the others.
- **`set -eu`** is in effect; an unset `VITE_*` var would not cause an error because each is expanded with `:-` (empty default).
- The script must remain executable and named with a `.sh` suffix under `/docker-entrypoint.d/` for the nginx entrypoint to pick it up. The `40-` prefix controls execution order relative to other scripts in that directory.
- Per in-file comments, the sole reader is `src/infrastructure/runtime-config.ts`, `index.html` loads the generated file before the app bundle, and `docs/tools/environment.md` documents the key whitelist.
