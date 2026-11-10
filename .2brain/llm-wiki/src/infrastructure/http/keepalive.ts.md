---
source: src/infrastructure/http/keepalive.ts
sha256: cd4d09a1cc1154097f2550ca6891407a5b146c7fa457d812dd70eef583395747
signature: fec2fc45da7bd33e8ba3e1850db94fc67a3645d407122e0930235f2c0ba39ff7
generated_at: 2026-11-10T03:05:06.124144+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/keepalive.ts

## Purpose

Provides a fire-and-forget HTTP write (`PUT`/`PATCH`/`POST`) that survives page unload by using `fetch` with `keepalive: true`. It exists because the generated axios client's XHR is canceled when the page goes away, and `sendBeacon` cannot carry an `Authorization` header. This is the only browser mechanism that lets a request finish after `pagehide` while still carrying a bearer token.

## Key elements

- **`sendKeepalive(method, path, body)`** — the sole export. Guards on `hasSession` (no-op if signed out), then fires a `fetch` with `keepalive: true`, JSON content type, optional `Authorization` header (from the session store's `accessToken`), `credentials: 'include'` for cookie-based sessions, and an `Accept-Language` header derived from the current i18n locale. The promise rejection is intentionally swallowed (`.catch(() => undefined)`) because no caller remains to handle it.

## Relationships

- **`src/infrastructure/http/client.ts`** — imports `instance` solely to read `instance.defaults.baseURL` and prepend it to the caller-supplied `path`. No other state from the axios instance is used.

## Notes

- The browser caps `keepalive` request bodies at **64 KiB**; the code assumes a quantity payload fits well within that limit.
- Only write verbs (`PUT | PATCH | POST`) are accepted; `GET` is deliberately excluded.
- If `accessToken` is falsy, no `Authorization` header is sent and the request relies on `credentials: 'include'` to deliver the session cookie instead.
- Because the response is discarded, any server-side validation failure (4xx/5xx) is invisible to the client. The comment notes the next page load re-reads server state, making the write idempotent in practice.
- The file is annotated `@module` — treat it as a namespace, not a default export.
