---
source: tests/support/e2e/admin-api-task.ts
sha256: 35eed0cbf8dbd491846a177bef2e6e3845f8f18f7ec6e80bffb4a07b4d2320b8
generated_at: 2026-10-17T02:24:31.222503+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/admin-api-task.ts

## Purpose

Provides two Cypress tasks — `adminApi` and `guestApi` — that perform API calls from Node (outside the browser) so the page's own cookie jar and session state remain untouched. This lets specs provision backend data and verify guest-facing behavior without the browser accidentally attaching or mutating its live session.

## Key elements

- **`adminApi<T>(req: AdminApiRequest): Promise<T | null>`** — Cypress task. Logs in as the supplied account, then makes one authenticated `fetch` to `apiUrl + path`. Resolves the unwrapped `data` field (or `null` for body-less responses like DELETE).
- **`guestApi({ apiUrl, path, method }): Promise<{ status, body }>`** — Cypress task. Makes a single unauthenticated `fetch`. Returns the HTTP status and the parsed JSON body (`null` if the body is not JSON). Useful for verifying what a truly anonymous client sees.
- **`AdminApiRequest`** (exported interface) — Shape of the arguments a spec passes to `adminApi`: `apiUrl`, `path`, `method`, `email`, `password`, optional `body`.
- **`login(apiUrl, email, password)`** (module-private) — POSTs to `/account/login` with `transport: 'bearer'` and extracts the `token` or `sessionToken` from the response.
- **`unwrap<T>(response, context)`** (module-private) — Parses the shared `{ success, data, message, errors }` envelope; on non-OK throws an Error that includes the status, message, and any `errors` array.
- **`jsonHeaders`** (module-private constant) — `Content-Type: application/json` header reused by every JSON request in this file.

## Relationships

- **`cypress.config.ts`** — Registers `adminApi` (and `guestApi`) as named Cypress tasks via `task('adminApi', …)`, making them callable from specs with `cy.task('adminApi', …)`. This file is the implementation that config wires up.

## Notes

- **No token caching.** The bearer token is fetched fresh on every `adminApi` call. `cy.restore()` reseeds the database between tests and invalidates prior tokens; a stale-token retry path was judged not worth the complexity for an in-memory backend.
- **`data ?? null` at the end of `adminApi`.** Cypress tasks must resolve to a serialisable value; `undefined` causes the command to fail. Body-less responses (e.g. DELETE) therefore resolve to `null`.
- **`transport: 'bearer'` at login.** In cookie mode the login endpoint would set a `Set-Cookie` the Node process cannot hold. Requesting bearer transport forces a `sessionToken`/`token` in the JSON body instead.
- **`guestApi` vs `cy.request`.** `cy.request` runs in the browser context and attaches the current session cookie, so it cannot simulate a truly anonymous caller. `guestApi` uses raw `fetch` from Node, bypassing the cookie jar entirely.
- **Error messages include `errors` payload.** The `unwrap` helper serialises `payload.errors` into the thrown message so a single failed run is self-describing (e.g. which field or cap was violated) without needing a retry.
