---
source: src/infrastructure/runtime-config.ts
sha256: 02fcc390eeed68e06ac76daa9097fceab67943dfccc6ff816253621d5eec2eee
generated_at: 2026-10-02T14:40:49.270334+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/runtime-config.ts

## Purpose

Single read-point for values a running container may override after the image is built. In Docker, `config.js` (generated at container start by `docker/docker-entrypoint.d/`, wired in via `docker/nginx.conf`) sets `window.__APP_CONFIG` before the bundle loads. In dev, unit tests, and `vite preview` that script never runs, so every read falls through to `import.meta.env.VITE_*` at the call site. There is no central config object — the fallback is always inline at the consumer.

## Key elements

- **`RuntimeConfig`** (interface) — whitelist of deployment-overridable keys (API URLs, app identity, locale, logging, upload limits, Faro/Umami telemetry, etc.). All values are non-secret and already ship in the compiled bundle.
- **`runtimeValue(name)`** (function) — reads `globalThis.__APP_CONFIG[name]`, trims the result, and returns `string | undefined`. Returns `undefined` (never `''`) when the key is absent, `config.js` never loaded, or the value is blank. Call sites chain `|| import.meta.env.VITE_X` as their fallback.

## Relationships

No graph-neighbor files are recorded for this module. Its only runtime dependency is the external `config.js` script injected by the Docker entrypoint (see `docker/nginx.conf`); it does not import or export any other project module.

## Notes

- `runtimeValue` uses `||`, **not** `??`. An empty string from a blank `.env` `VITE_*` line is indistinguishable from unset and must resolve to `undefined` so the `||` fallback fires. Do not "fix" this to `??` without understanding the blank-string contract.
- Call sites must always supply their own `import.meta.env.VITE_*` default: `runtimeValue('API_URL') || import.meta.env.VITE_API_URL`. Omitting the fallback means the value is simply `undefined` in non-Docker environments.
- All `RuntimeConfig` fields are optional (`?`). A partial `__APP_CONFIG` object is valid; only the keys present are readable.
- Nothing in this file is secret or will ever be secret — the values are already embedded in the shipped bundle. Do not use it for credentials or tokens.
