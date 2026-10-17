---
source: src/infrastructure/runtime-config.ts
sha256: fc191585c85a6232d3895192d6cf55063b295fb4208ecb05ab9fdb0d492232ed
generated_at: 2026-10-17T00:11:53.395128+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/runtime-config.ts

## Purpose

Single reader for deployment values a running container may override at start time. Reads from `window.__APP_CONFIG` (populated by a `config.js` generated at container start) and falls back to `import.meta.env.VITE_*` build-time defaults. Dev, unit tests, and `vite preview` never receive `config.js`, so they always hit the fallback — same code path, no central config object.

## Key elements

- **`RuntimeConfig` (interface)** — Whitelist of overridable keys (`API_URL`, `FARO_*`, `UMAMI_*`, locale/log/upload settings, etc.). All values ship to the browser in the compiled bundle; none are or will be secrets.
- **`runtimeValue(name)`** — Reads one key from `__APP_CONFIG`, trims it, and returns `string | undefined`. Blank or missing values yield `undefined` (never `''`).
- **`readApiUrl()`** — Convenience wrapper returning `string`. Falls through `runtimeValue('API_URL')` → `import.meta.env.VITE_API_URL` → `''`. An empty result means the API is served from the page's own origin.

## Relationships

No graph neighbors recorded.

## Notes

- `runtimeValue` deliberately uses `||` rather than `??`: a blank `VITE_*` line in `.env` resolves to `''`, which must be treated as *unset*. Call sites chain `|| import.meta.env.VITE_X` safely because unset values are `undefined`, not `''`.
- The `__APP_CONFIG` object is injected by `docker/nginx.conf` / `docker/docker-entrypoint.d/` before the app bundle loads; it is **not** part of the Vite build.
- Every value in `RuntimeConfig` is non-secret by design — if a value must never reach the browser, it does not belong in this interface.
