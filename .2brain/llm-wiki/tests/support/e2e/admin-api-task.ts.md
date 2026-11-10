---
source: tests/support/e2e/admin-api-task.ts
sha256: 2640fb87786c8bec8225d19350118114c2fb664d1bdc6c6347f365a0f8416191
signature: b2481dc8fa4f5709b2db7b3af213721cab294d659c8e2e5d897ada268c66eb89
generated_at: 2026-11-10T07:27:20.366195+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/admin-api-task.ts

## Purpose

Provides Cypress Node-side tasks (`adminApi`, `guestApi`) that make authenticated or unauthenticated HTTP calls to the backend API via plain `fetch`, keeping the browser's cookie jar and session state untouched. This lets e2e specs provision or verify data as a specific account without interfering with the page under test.

## Key elements

- **`adminApi<T>(request: AdminApiRequest): Promise<T | null>`** — The main task. Logs in (or reuses a cached staff bearer), performs one authenticated request, and resolves the unwrapped `data` payload. Staff tokens are cached per `apiUrl|email` key to avoid re-minting TOTP codes on every call; a 401 on a cached token triggers a re-login.
- **`guestApi(...)`** — A single unauthenticated request from Node. Returns `{ status, body, headers }`. Exists because `cy.request` would attach the browser's session cookie, defeating the "guest" intent.
- **`forgetAdminTokens(): null`** — Clears the staff-token cache. Must be called after `cy.restore()` reseeds the database, since restore invalidates all sessions.
- **`AdminApiRequest`** (exported interface) — The shape of arguments passed to `adminApi`: `apiUrl`, `path`, `method`, `email`, `password`, optional `totpSecret`, optional `body`.
- **`unwrap<T>(response, context)`** — Parses the backend envelope, throws a descriptive error (including `title`, `detail`, `errors`) on non-OK status, and returns the payload on success.
- **`loginTokens` / `login`** — Internal helpers that perform `POST /account/login` (and `POST /account/login/2fa` when MFA is required), with one retry on a 422 from the 2FA step (the TOTP code may have been consumed by the backend's own boot-time staff sign-in).
- **`staffTokens: Map<string, string>`** — Module-level cache of bearer tokens for staff accounts that require TOTP.

## Relationships

- **`cypress.config.ts`** — Imports the exported functions (`adminApi`, `guestApi`, `forgetAdminTokens`) and registers them as Cypress tasks, making them callable from specs. This file is the implementation behind that registration.
- **`scripts/e2e/totp.ts`** — Exports `loginTotpCodeFor`, which this file calls to generate a valid TOTP code for the 2FA challenge during staff login.

## Notes

- Tokens for TOTP-protected (staff) accounts are cached to avoid the 30-second TOTP step clock; shopper tokens are always fetched fresh. Calling `forgetAdminTokens` after a data restore is mandatory—stale tokens will 401.
- The login 2FA step retries once on 422 because the backend may have already consumed that TOTP step (e.g., during its own boot-time staff sign-in). A second code targets the next 30-second window.
- `adminApi` resolves to `null` (not `undefined`) for body-less responses (204, 202), because Cypress tasks must resolve to a serialisable value.
- The request's `method` and `path` are passed through verbatim; there is no URL-building logic here beyond `${apiUrl}${path}`.
- `guestApi` lower-cases response header names via `Object.fromEntries(response.headers.entries())`; request headers are sent as-is.
