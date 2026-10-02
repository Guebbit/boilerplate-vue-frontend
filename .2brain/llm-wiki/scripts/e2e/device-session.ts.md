---
source: scripts/e2e/device-session.ts
sha256: 3b5586ca7d3cfd2a1c9b5ff709e8018ac2821f0c16c7865bc55c9cc53d52ad85
generated_at: 2026-10-02T11:34:00.263896+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/device-session.ts

## Purpose

Simulates a **second device** (server-side) for E2E tests. Because a plain Node `fetch` has no shared cookie jar with the Cypress-controlled page, a login performed here keeps its own refresh cookie and access token without disturbing the page's session. This makes it possible to prove logout-everywhere or password-reset behavior: a subsequent refresh from this device should fail. The module is intentionally stateless and Cypress-free so it can be unit-tested in a plain Node environment.

## Key elements

- **`Device`** (interface) — the value a spec carries between calls: `apiUrl`, bearer `token`, and refresh `cookie` (as a `Cookie` header string, e.g. `jwt=<value>`).
- **`DeviceResponse`** (interface) — one answer: HTTP `status`, parsed `body`, and the `device` as it stands after the call. Non-2xx status is data, not an exception.
- **`DeviceCredentials`** / **`DeviceRequest`** (interfaces) — typed inputs for `deviceLogin` and `deviceRequest`.
- **`refreshCookieFrom`** (exported) — extracts the `jwt=…` Set-Cookie from a `Response`'s headers. Returns `null` when absent or empty (i.e. the server cleared it on logout).
- **`deviceLogin`** (exported) — POSTs to `/account/login`, returns a fresh `Device`. Throws on a refused login or a missing token/cookie.
- **`deviceRefresh`** (exported) — GETs `/account/refresh` with the device's cookie. Returns the `DeviceResponse` (including 401) rather than throwing, so a spec can assert on a refused refresh.
- **`deviceRequest`** (exported) — one authenticated call (`Bearer` token + cookie) to any path. Returns the `DeviceResponse`; the `device` in the response is unchanged (token is never rotated by a data call, but the cookie is preserved for a follow-up refresh assertion).
- **`tokenIn`**, **`parseJson`**, **`jsonOf`**, **`afterAnswer`** (private) — small helpers for extracting the token from the JSON envelope, safely parsing a body, and folding a response back into a `Device`.

## Relationships

- **`cypress.config.ts`** — provides the `cy.task` wiring that bridges Cypress specs to these exported functions. This file itself contains no Cypress API.
- **`tests/unit/scripts/e2e/device-session.spec.ts`** — the unit suite that imports and exercises the exported functions in a plain Node context (no browser). This file is deliberately placed outside `tests/support/e2e/` so that import does not pull in the Cypress harness.
- **`tests/support/e2e/harness.ts`** — no direct interaction; this file is kept *outside* that directory by design so the unit suite can load it independently of the E2E harness.

## Notes

- **Non-2xx is a return value, not a throw.** `deviceRefresh` and `deviceRequest` resolve with the status code so specs can assert `401` on a refused refresh. Only `deviceLogin` throws (login is expected to succeed or the test is meaningless).
- **`deviceRequest` does not update the returned device.** The access token is never rotated by a data call, and the cookie is intentionally left as-is so the spec can hand the *stale* cookie to a follow-up `deviceRefresh` and assert it is now rejected.
- **`refreshCookieFrom` uses `getSetCookie()`**, not `get('set-cookie')`, to keep individual Set-Cookie headers distinct.
- **The refresh cookie name is `jwt`** (constant `REFRESH_COOKIE`), matching the backend's `REFRESH_COOKIE`.
- **No module-level state.** Every function is pure or takes the `Device` as a parameter; a spec can hold multiple devices as plain values in parallel.
