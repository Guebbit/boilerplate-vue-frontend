---
source: src/infrastructure/http/keepalive.ts
sha256: 6af5881f605d8403b01a8a69ecd6c554ae176c08d44b38032e11a69f9d3a52d1
generated_at: 2026-10-02T14:39:48.151856+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/keepalive.ts

## Purpose

Provides a single fire-and-forget helper for sending a JSON write that survives the page's unmount. Because the generated axios client rides XHR (cancelled with the page) and `sendBeacon` cannot carry a bearer header, this file uses `fetch` with `keepalive: true` as the one browser mechanism that lets a request complete after `pagehide`.

## Key elements

- **`sendKeepalive(method, path, body)`** — The sole export. Sends a `PUT`, `PATCH`, or `POST` with a JSON body via `fetch(..., { keepalive: true })`. Returns `void`.
  - Aborts silently if no `accessToken` is present in the session store (signed-out callers cannot authenticate).
  - Builds the URL from `instance.defaults.baseURL` + `path`.
  - Sets `Authorization`, `Content-Type`, `Accept`, and `Accept-Language` headers.
  - Swallows all errors (`.catch(() => undefined)`); the next page load reads server state instead.
  - Body is subject to the browser's 64 KiB `keepalive` cap.

## Relationships

- **`src/infrastructure/http/client.ts`** — Imports the shared axios `instance` solely to read `instance.defaults.baseURL` so the keepalive request targets the same API origin without re-declaring the base URL.

## Notes

- Intentionally **not** idempotent-safe: a dropped request means the write never lands. The module doc states the recovery model is "next visit reads the server's own state," so callers must not assume the write succeeded.
- `method` is restricted to `PUT | PATCH | POST`; `GET` is excluded by the type signature.
- `credentials: 'include'` is set even though `Authorization` is passed as a header, matching the pattern used elsewhere in the HTTP layer.
- The Pinia store is read via `storeToRefs` inside the function call, so the session must still be alive at call time (i.e., this must be invoked *before* the store is torn down).
