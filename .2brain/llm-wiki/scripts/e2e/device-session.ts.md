---
source: scripts/e2e/device-session.ts
sha256: 0c731a563d0eaa1fb2cbeb45605349a35599b1333ea87b1de3efab183e97f6a6
signature: 3ca52534cdef27a3d2e3a51b0243ce1cd0dadcebe21841c056a7883b58894480
generated_at: 2026-11-10T02:32:29.855489+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/device-session.ts

## Purpose

Simulates a "second device" in e2e journey tests: a server-side login that carries its own session cookie (and, in `jwt` mode, an access token) independent of the Cypress page's session. Exists so specs can prove cross-device effects — logout-everywhere, password reset, session expiry — by asserting that this device's subsequent refresh returns 401.

## Key elements

- **`Device`** (interface) — the state a device holds: `apiUrl`, `mode` (`'jwt' | 'cookie'`), `token`, `cookie`.
- **`DeviceResponse`** (interface) — a call's result: `status`, parsed `body`, and the `Device` as it stands after the call.
- **`sessionCookieFrom(headers)`** — extracts the `__Host-session` value from `Set-Cookie` headers; returns `null` when the cookie was cleared.
- **`deviceLogin(credentials)`** — reads `GET /config` for the session mode, posts credentials to `/account/login`, answers a TOTP challenge if one is presented, and returns a `Device`. Throws on failure.
- **`deviceRefresh(device)`** — checks whether the session is still alive: `POST /account/refresh` in `jwt` mode, `GET /account` in `cookie` mode. Returns the response (including 401) rather than throwing.
- **`deviceRequest({device, path, method, body})`** — a single authenticated API call carrying both the bearer token and the session cookie. Returns the response without mutating the device's token/cookie.
- **`answerChallenge`** (internal) — second-step TOTP flow using `loginTotpCodeFor`.
- **`afterAnswer`** (internal) — produces the updated `Device` after a call (rotates token/cookie from the response).

## Relationships

- **`scripts/e2e/totp.ts`** — imported for `loginTotpCodeFor`, which generates the TOTP code during `deviceLogin`'s challenge step.
- **`cypress.config.ts`** — contains the task wiring that exposes this module's exports to the spec layer, letting specs invoke `deviceLogin`, `deviceRefresh`, and `deviceRequest` from within a test.
- **`tests/support/e2e/steps.ts`** / **`security-steps.ts`** / **`harness.ts`** — spec-level step definitions that call into `deviceLogin`, `deviceRefresh`, and `deviceRequest` to script two-device interactions.
- **Journey specs** (`ac12-my-privacy-choices-stick`, `ac17-copied-session-cookie`, `ac25-what-i-agreed-to`, `cu23-the-days-run-out`) — each orchestrates a scenario where a second device's session is expected to survive or be revoked.
- **`tests/unit/scripts/e2e/device-session.spec.ts`** — unit-tests the pure functions (`sessionCookieFrom`, `deviceLogin`, `deviceRefresh`, `deviceRequest`) without a browser.

## Notes

- **Stateless by design.** The spec owns the `Device` value and passes it back on every call; nothing is stored in the Cypress node process. Two devices in one test are just two plain objects.
- **Non-2xx is data, not an error.** `deviceRefresh` and `deviceRequest` return the status code so a spec can assert `401` after a revocation. Only `deviceLogin` throws on failure.
- **`deviceRequest` does not rotate credentials.** The returned `device` is unchanged (token and cookie kept as-is) so the spec can still replay the *original* cookie to prove it is now dead.
- **Cookie-mode token is `''`, not `undefined`.** In `cookie` mode the `token` field is always the empty string; `deviceRequest` omits the `Authorization` header when it is `''`.
- **`getSetCookie()` vs `get('set-cookie')`.** `sessionCookieFrom` uses the multi-value `getSetCookie()` API to correctly find the right `Set-Cookie` line when a response sets several cookies.
- **Placed outside `tests/support/e2e/`** so the unit suite can import it directly without pulling in the Cypress runtime.
