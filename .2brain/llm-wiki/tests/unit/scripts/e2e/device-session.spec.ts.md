---
source: tests/unit/scripts/e2e/device-session.spec.ts
sha256: e2c276ced1dae1daad9a7c035df4f0ef415abe089de75dae4127a925100b8c3b
signature: 02360467d8a018fb7748d1780679505ef8d1552f82f43664536a1331ceae9502
generated_at: 2026-11-10T08:16:06.050637+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/device-session.spec.ts

## Purpose

Unit tests for the `scripts/e2e/device-session.ts` module. Verifies that a "second device" in E2E scripts correctly manages its own session cookie across both `jwt` and `cookie` session modes—covering login, token/cookie rotation on refresh, and request header assembly—using a stubbed `fetch` so no real network calls are made.

## Key elements

- **`answer(status, body, cookies?)`** — Builds a `Response` with a JSON-serialised body and one or more `Set-Cookie` headers.
- **`stubFetch(...responses)`** — Replaces global `fetch` with a queue of canned responses; returns an array of recorded `{ url, init }` calls for assertion.
- **`modeAnswer(mode)`** — Convenience wrapper around `answer` that returns the `GET /config` payload `{ session: { mode } }`.
- **`device`** — Fixture: a `jwt`-mode `Device` (access token + refresh cookie).
- **`cookieDevice`** — Fixture: a `cookie`-mode `Device` (cookie only, empty token).
- **`describe('sessionCookieFrom')`** — Tests extraction of `__Host-session` from multi-value `Set-Cookie` headers and null/cleared-cookie cases.
- **`describe('deviceLogin')`** — Tests login in both modes, unknown-mode rejection, 401 refusal, and MFA-challenge rejection.
- **`describe('deviceRefresh')`** — Tests token+cookie rotation in jwt mode, `GET /account` fallback in cookie mode, and 401 revocation handling.
- **`describe('deviceRequest')`** — Tests correct `Authorization`/`Cookie` headers per mode, JSON body serialisation, non-2xx passthrough, and non-JSON body tolerance.

## Relationships

- **`scripts/e2e/device-session.ts`** — The module under test. This spec imports `deviceLogin`, `deviceRefresh`, `deviceRequest`, `sessionCookieFrom`, and the `Device` type from it.
- **`tests/unit/scripts/contracts/shared-rules.spec.ts`** — Sibling unit test in the same `tests/unit/scripts` tree; no direct import or shared helper in this file.

## Notes

- `fetch` is stubbed via `vi.stubGlobal`; tests never hit a real server. The stub is a simple FIFO queue—each test must enqueue exactly as many responses as the code under test will issue.
- The `stubFetch` helper does **not** auto-clean up (no `vi.unstubAllGlobals` in a `finally`); each test overwrites the stub, so ordering within a `describe` block matters if a test forgets to stub.
- `deviceRequest` tests assert that non-2xx responses (403, 204, 502) are returned as `{ status, body }` data rather than thrown—this is the module's contract and a common source of confusion vs. typical `fetch`-wrappers.
- Cookie-mode refresh hits `GET /account` (not `/account/refresh`); this asymmetry is intentional and tested explicitly.
