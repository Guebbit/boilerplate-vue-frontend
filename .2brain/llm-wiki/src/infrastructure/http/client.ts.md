---
source: src/infrastructure/http/client.ts
sha256: b83f7f1725a639d29bd3d85ce99c77d8ca0ba36fa46617231300ae9f64f62521
generated_at: 2026-10-02T11:54:56.695813+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/client.ts

## Purpose

Defines and exports the single shared axios instance used by every HTTP client in the app. It is the leaf of the http tier: fully configured (headers, credentials, timeout, base URL) but carries no interceptors and imports nothing else from this application, guaranteeing that importing it can never create a circular dependency back into `index.ts`.

## Key elements

- **`instance`** (exported `const`) — the one axios instance created via `axiosClient.create`. Carries:
  - Default `Accept` / `Content-Type` JSON headers.
  - `withCredentials: true` so the httpOnly refresh cookie is sent on every request without JS ever reading the token.
  - A `timeout` resolved from `runtimeValue('AXIOS_TIMEOUT')` → `VITE_AXIOS_TIMEOUT` → `10000` ms.
  - A `baseURL` resolved from `runtimeValue('API_URL')` → `VITE_API_URL` → `''`.

## Relationships

- **`src/infrastructure/http/index.ts`** — imports `instance` from this file and attaches request/response interceptors (auth token injection, refresh orchestration) onto it before re-exporting the wired-up client to the rest of the app.
- **`src/infrastructure/http/refresh.ts`** — operates against the same `instance`; the `withCredentials` flag set here is what lets the browser send the httpOnly refresh cookie that `refresh.ts` relies on.
- **`src/infrastructure/http/step-up.ts`** — issues step-up (elevated-privilege) requests through `instance`, inheriting its base URL, headers, and timeout.

## Notes

- **Base URL is runtime-mutable in e2e.** The e2e shard runner overwrites `window.__APP_CONFIG.API_URL` before boot so each shard can point at its own demo backend without rebuilding the bundle. In production a running container's `config.js` takes the same path. Do not assume the compile-time `VITE_API_URL` is the value actually used.
- **Leaf constraint is intentional.** Do not add imports of app code (services, stores, other http-tier files) into this module; doing so would re-enter `index.ts` mid-evaluation and break the initialization order.
- **Timeout parsing uses `Number.parseInt`**, not `Number`. A value like `"10000abc"` will silently parse to `10000` rather than producing `NaN`.
