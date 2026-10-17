---
source: src/infrastructure/http/keepalive.ts
sha256: 7233716cb367efaba028f3b7ee2554beaa1d8828f3f01af07659300d8003f4ac
generated_at: 2026-10-17T00:10:04.892720+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/keepalive.ts

## Purpose

Provides a fire-and-forget JSON write that survives page unload. The generated client rides axios (XHR), which is cancelled the moment the page goes away; `fetch` with `keepalive: true` is the one browser mechanism that lets a request finish after `pagehide` while still carrying a bearer token (unlike `sendBeacon`, which is POST-only and has no header support).

## Key elements

- **`sendKeepalive(method, path, body)`** — the sole export. Accepts a verb (`PUT` | `PATCH` | `POST`), an API-relative path (leading slash), and a JSON-serialisable body. Checks the session store; if no active session, returns silently (avoids a guaranteed 401). Otherwise issues a `fetch` with `keepalive: true`, `credentials: 'include'`, JSON content/accept headers, optional `Authorization: Bearer` header (from the session store), `Accept-Language` from the current i18n locale, and a stringified JSON body. The promise rejection is swallowed (`.catch(() => undefined)`); the next page load reads server state.

## Relationships

- **`src/infrastructure/http/client.ts`** — imports `instance` (the shared axios instance) solely to read `instance.defaults.baseURL`, which is prepended to `path` before the `fetch` call. No requests are routed through axios here; the two files use different transports for the same base URL.

## Notes

- The `keepalive` spec caps the request body at **64 KiB**; exceeding it silently drops the request. The module comment notes this is "far above a quantity," but it is still a hard ceiling.
- The function is intentionally void and uncatchable by callers — there is no way to observe success or failure.
- `credentials: 'include'` is required so the session cookie rides along; the `Authorization` header is added conditionally on top (only when `accessToken` is truthy).
- Only `PUT`, `PATCH`, and `POST` are accepted; `GET`/`DELETE` are not in the type union.
