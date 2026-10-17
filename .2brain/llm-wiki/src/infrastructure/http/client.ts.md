---
source: src/infrastructure/http/client.ts
sha256: ac4cbc3415e28631a829d7731d9716703c8b14cc3b67d020c618fb558fb1c3d2
generated_at: 2026-10-17T00:09:02.812601+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/client.ts

## Purpose

Creates and exports a single shared axios instance that every API client in the app routes through. It sits at the leaf of the http tier and is intentionally free of app-level imports so it can be pulled in without triggering circular evaluation of `index.ts`.

## Key elements

- **`instance`** (exported) — the sole axios instance. Configured with JSON headers, `withCredentials: true`, and a timeout read from `runtimeValue('AXIOS_TIMEOUT')` → `VITE_AXIOS_TIMEOUT` → `10000` ms. Its `baseURL` is set to whatever `readApiUrl()` returns at import time.

## Relationships

- **`src/infrastructure/http/index.ts`** — The only consumer that *adds* behavior to this instance: it attaches request/response interceptors. This file stays inert so `index.ts` can import it without re-entering its own evaluation.
- **`src/infrastructure/http/refresh.ts`** — The `withCredentials` flag here exists specifically so the httpOnly refresh cookie is sent on every request, enabling the refresh flow without the token ever being readable from JS.

## Notes

- **Base URL is runtime-injected.** `readApiUrl()` reads `window.__APP_CONFIG.API_URL` (set by the e2e shard runner in `tests/support/e2e/commands.ts`) or a container's `config.js`. A built bundle cannot bake in a fixed URL because each e2e shard owns its own demo backend.
- **No interceptors live here.** If you need auth headers, error handling, or retry logic, look in `index.ts`—modifying this file will not affect runtime behavior beyond the defaults above.
- **Timeout fallback chain:** `runtimeValue('AXIOS_TIMEOUT')` → `import.meta.env.VITE_AXIOS_TIMEOUT` → literal `'10000'`. All three are strings; `Number.parseInt` converts.
