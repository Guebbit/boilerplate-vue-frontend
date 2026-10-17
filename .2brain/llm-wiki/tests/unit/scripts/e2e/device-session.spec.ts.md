---
source: tests/unit/scripts/e2e/device-session.spec.ts
sha256: 9eca9db83c54b278f338e834163286a373a0367b9ce593d9fc0f795199fa87ac
generated_at: 2026-10-17T02:42:38.590353+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/device-session.spec.ts

## Purpose

Unit test suite for the `scripts/e2e/device-session.ts` module. It verifies the pure logic of a "second device" — how it selects, retains, and rotates its session credentials (access token vs. `__Host-session` cookie) across login, refresh, and arbitrary API calls, in both `jwt` and `cookie` session modes. All network I/O is replaced by queued stub responses so the tests exercise only the device's decision-making, not the transport.

## Key elements

- **`answer(status, body, cookies?)`** — Helper that builds a `Response` with a JSON body and optional `Set-Cookie` headers. Returns `null` body when the caller passes `null`.
- **`stubFetch(...responses)`** — Replaces the global `fetch` with a queue-based stub; returns an array of recorded `{url, init}` call objects for assertions.
- **`modeAnswer(mode)`** — Shorthand for a 200 response to `GET /account/session-config` declaring the session mode.
- **`device` / `cookieDevice`** — Two `Device` fixtures: one in `jwt` mode (token + refresh cookie), one in `cookie` mode (cookie only, empty token).
- **`describe('sessionCookieFrom', …)`** — Tests that the helper extracts `__Host-session` from multiple `Set-Cookie` lines and returns `null` when the cookie is absent or explicitly cleared (expired).
- **`describe('deviceLogin', …)`** — Covers: jwt-mode login (keeps token + refresh cookie), cookie-mode login (keeps cookie, no token), unknown mode rejection, 401 refusal, and MFA-challenge rejection.
- **`describe('deviceRefresh', …)`** — Covers: jwt-mode rotation (sends old cookie, receives new token + cookie), cookie-mode refresh via `GET /account`, revoked-session 401, and refused refresh returning the device unchanged.
- **`describe('deviceRequest', …)`** — Covers: correct `Authorization`/`Cookie`/`Content-Type` headers and JSON body, cookie-mode omitting `Authorization`, non-2xx returned as data (not thrown), and non-JSON bodies mapped to `null`.

## Relationships

- **`scripts/e2e/device-session.ts`** — The module under test. This spec imports `deviceLogin`, `deviceRefresh`, `deviceRequest`, `sessionCookieFrom`, and the `Device` type from that file. All assertions in the spec validate the contract those functions expose.

## Notes

- `fetch` is stubbed via `vi.stubGlobal`; every test in `afterEach` calls `vi.unstubAllGlobals()` to restore it.
- The test files deliberately use *response queues* (FIFO) rather than per-URL matching, so the number and order of stubbed responses must match the number of fetches the function performs.
- `stubFetch` returns the `calls` array; tests that don't need to assert on request shape simply call it without capturing the return value.
- In cookie mode the "refresh" is a plain `GET /account`, not a dedicated refresh endpoint — a convention specific to this codebase's session design.
- Non-2xx responses and unparseable bodies are *returned* (as `{status, body}`), never thrown; only login-level errors (unknown mode, 401, MFA) use `rejects.toThrow`.
