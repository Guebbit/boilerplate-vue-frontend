---
source: src/infrastructure/http/client.ts
sha256: 5c9aea5f450c1fe4a4754d32c865b8da2054fb9358b47a9b0a8dfa99e1f5084f
signature: 7cd870313e32575c907c6cc74b94e3ebae0949f97e2e25371904bc2e0dac23af
generated_at: 2026-11-10T03:02:45.214356+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/client.ts

## Purpose

The leaf node of the HTTP tier: a single, pre-configured axios instance that every API client in the app goes through. It exists as a dedicated, import-safe module so that higher-level wiring (interceptors, error handling) in `index.ts` never risks a circular import back into this file.

## Key elements

- **`instance`** (exported) — the shared axios instance. Configured with:
  - `Accept: application/json, application/problem+json` and a JSON `Content-Type` header.
  - `withCredentials: true` — carries the httpOnly refresh cookie so the refresh flow works without JS-readable tokens.
  - `timeout` resolved from `runtimeValue('AXIOS_TIMEOUT')` → `VITE_AXIOS_TIMEOUT` → `'10000'` (ms).
  - `baseURL` set from `readApiUrl()`; absolute URLs bypass it. The e2e shard runner injects `window.__APP_CONFIG.API_URL` before boot to override this per-shard.

## Relationships

- **`src/infrastructure/http/index.ts`** — Imports `instance` and attaches interceptors onto it. This file deliberately imports nothing from `index.ts` to stay the evaluation leaf.
- **`src/infrastructure/http/refresh.ts`** — The refresh flow depends on `instance`'s `withCredentials: true` to receive the httpOnly refresh cookie on every request.
- **`src/infrastructure/http/keepalive.ts`** / **`src/infrastructure/http/step-up.ts`** — Graph neighbors that consume `instance` for their outbound HTTP calls.
- **`@/infrastructure/runtime-config`** — Provides `readApiUrl` and `runtimeValue` used during instance setup.

## Notes

- This file must **never** import from `index.ts` or any other module in the http tier; doing so would re-enter `index.ts` mid-evaluation and break interceptor wiring.
- The `Accept` header includes `application/problem+json` (RFC 9457) so axios can parse structured error responses without a separate content-type check.
- Timeout resolution is a three-level fallback chain; the first non-empty value wins. All three are string-parsed with `Number.parseInt`.
- `baseURL` is set **after** creation (not in the config object) because `readApiUrl()` may read a runtime-injected global that is not yet available at `create()` time.
