---
source: scripts/e2e/device-session.ts
sha256: 2ce1b7aee7bba4843ba016455e2277ea59fda9253cd3aa54a9b05c90e48c14aa
generated_at: 2026-10-17T00:00:15.648431+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/device-session.ts

## Purpose

Implements a "second device" for E2E journey tests: a server-side login that maintains its own session cookie (and, in `jwt` mode, an access token) independently of the browser's session. Journey specs use it to prove session-scoped guarantees — that a logout-everywhere, password reset, or session expiry invalidates *this* device's session by asserting a subsequent refresh is refused. Stateless by design: the spec owns the `Device` value and passes it back on every call. Deliberately free of Cypress and placed outside `tests/support/e2e/` so the unit suite can import and pin it without a browser.

## Key elements

- **`SessionMode`** — `'jwt' | 'cookie'`; the two deployment session strategies.
- **`Device`** — the opaque value a spec holds: `apiUrl`, `mode`, `token`, `cookie`.
- **`DeviceResponse`** — `{ status, body, device }`; non-2xx is returned data, not an exception.
- **`deviceLogin`** — reads session mode, performs `POST /account/login`, extracts cookie (and token in `jwt` mode), returns a `Device`. Throws on refusal or missing session.
- **`deviceRefresh`** — validates/renews the session. In `jwt` mode: `POST /account/refresh`. In `cookie` mode (no refresh endpoint): `GET /account`. Returns `DeviceResponse` so a 401 is assertable.
- **`deviceRequest`** — one authenticated call carrying both the bearer token (if any) and the session cookie. Returns `DeviceResponse`; does **not** rotate the cookie, so the spec can still demonstrate that the old cookie is now dead.
- **`sessionCookieFrom`** — extracts the `__Host-session` cookie from response `Set-Cookie` headers (uses `getSetCookie()` to handle multiple cookies correctly).
- Internal helpers: `readSessionMode`, `tokenIn`, `parseJson`, `jsonOf`, `afterAnswer`.

## Relationships

- **`cypress.config.ts`** — registers `cy.task` entries that proxy to the exported functions, making them callable from specs.
- **`tests/support/e2e/harness.ts`** — composes device calls into higher-level journey steps (login, refresh, request) used by multiple specs.
- **`tests/support/e2e/security-steps.ts`** — builds security-specific assertions (reset, logout-everywhere) on top of `deviceRefresh` / `deviceRequest`.
- **Journey specs** (`ac12-…-stick.cy.ts`, `ac17-copied-session-cookie.cy.ts`, `cu23-the-days-run-out.cy.ts`) — end consumers that hold a `Device` and assert its refresh is 200 or 401 at specific points.
- **`tests/unit/scripts/e2e/device-session.spec.ts`** — unit-tests the pure functions in isolation (no browser, no network mock beyond `fetch`).

## Notes

- **Stateless contract:** No module-level mutable state. Two devices in one test are two plain `Device` objects; nothing persists in the Cypress node process.
- **`deviceRequest` preserves the old cookie** even when a response sets a new one (e.g., logout clears it). This is intentional: the spec then calls `deviceRefresh` with that stale cookie and asserts 401.
- **`cookie` mode has no refresh endpoint** (`POST /account/refresh` would 404). `deviceRefresh` falls back to `GET /account` which returns 200 while alive, 401 once revoked.
- **Non-2xx is data, not an error.** All exported call functions resolve with the status code; only `deviceLogin` throws (on a hard failure like a 2FA challenge or a missing session).
- **`getSetCookie()` over `get('set-cookie')`** — the former preserves individual `Set-Cookie` lines; the latter concatenates them, which would corrupt multi-cookie responses.
