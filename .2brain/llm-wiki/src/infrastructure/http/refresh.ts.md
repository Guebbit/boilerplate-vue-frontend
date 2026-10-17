---
source: src/infrastructure/http/refresh.ts
sha256: 22669dd58fa1432a1f1a9f6966662827d8317c73a9353ba4f215bd6d37bdff03
generated_at: 2026-10-17T00:10:23.730226+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/refresh.ts

## Purpose

Response-error interceptor that implements the refresh-and-retry flow: on a 401 (excluding auth endpoints), it calls `session.refreshToken()` once and replays the original request. In `cookie` mode there is no refresh endpoint, so a 401 immediately ends the session instead.

## Key elements

- **`REFRESH_EXCLUDED_PATHS`** — Set of pathnames (`/account/login`, `/account/signup`, `/account/reset`, `/account/reset-confirm`, `/account/login/2fa`, `/account/login/2fa/send`) where a 401 is a genuine credential failure and must not trigger a refresh.
- **`shouldSkipRefresh(url)`** — Returns `true` if the URL's pathname (via `toPathname`) is in the excluded set.
- **`isIdleRefusal(error)`** — Detects a 401 whose body carries `ERROR_CODES.SESSION_IDLE`, meaning the server ended the session for inactivity.
- **`endCookieSession(error)`** — In cookie mode: signals expiration on the session store (if a session exists) and delegates to `onResponseReject`.
- **`onResponseRejectWithRefresh(error)`** *(exported)* — The main interceptor. Order of checks:
  1. Idle refusal → `session.signalIdle()` + reject.
  2. 401 + not already refreshed (`_refreshed`) + not excluded → in token mode, call `session.refreshToken()` and replay via `instance.request` with `_refreshed: true`; in cookie mode, call `endCookieSession`.
  3. Fallback → `onResponseReject(error)`.

## Relationships

- **`client.ts`** — Imports `instance` (the Axios instance) to replay the original request after a successful refresh.
- **`interceptors.ts`** — Imports `onResponseReject` as the terminal rejection path when refresh is not possible or fails.
- **`step-up.ts`** — Shares the `_steppedUp` guard convention; a request may be refreshed once *and* stepped up once (mutually independent guards).
- **`types.ts`** — Imports `AxiosRequestConfigWithRetry`, `AxiosResponseErrorBody`, `AxiosResponseErrorData` for typing the error and replay config.
- **`url.ts`** — Imports `toPathname` to normalize URLs before matching against the excluded set.
- **`infrastructure/session.ts`** — Uses `useSessionStore()` for `mode`, `hasSession`, `signalExpired`, `signalIdle`, and `refreshToken`.

## Notes

- The `_refreshed` flag is the single-retry loop guard; it does **not** block a step-up (that has its own `_steppedUp` guard). A request can be refreshed once and stepped up once in sequence.
- `refreshToken` (in `session.ts`) is single-flight and epoch-guarded against stale results after `clearSession`; this module only decides *when* to call it and how to handle the returned token.
- In `cookie` mode `POST /account/refresh` is a 404, so the code short-circuits to `endCookieSession` rather than attempting a refresh.
- The 2FA endpoints are explicitly excluded because a wrong/expired 2FA code returns 401 as a normal business outcome; without exclusion a visitor with a stale refresh cookie would get a silent replay instead of "wrong code".
