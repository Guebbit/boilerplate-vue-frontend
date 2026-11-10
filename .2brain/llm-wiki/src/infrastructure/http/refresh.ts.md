---
source: src/infrastructure/http/refresh.ts
sha256: 7d302d128d725b0b967a3b1a3c8054e38a7d121e1d075b1d8db0eac3d66c7cd4
signature: 2c216da8331c34bbbb81c3d5a52409186d3d263403bb7761cd662d9615a97bdb
generated_at: 2026-11-10T03:05:55.256402+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/refresh.ts

## Purpose

Response-error interceptor that implements the refresh-and-retry flow. On a 401 (outside excluded auth endpoints) it renews the token via the session store and replays the original request exactly once. It also handles the terminal cases—idle timeout, cookie-mode expiry, and a refresh the server refused outright—by replaying the request as a guest so a product page degrades to anonymous access instead of showing an error.

## Key elements

- **`onResponseRejectWithRefresh`** (exported) — The main entry point called by the response interceptor chain. Decides whether to refresh, replay with the new token, replay as guest, end a cookie session, or simply normalize the rejection. Also triggers `reloadAbilities()` on a 403 for signed-in users (except `GET /account`).
- **`NO_REFRESH_ROUTES`** — Derived from the route table; routes flagged `x-no-refresh` where a 401 is a genuine credential failure, not an expired token.
- **`shouldSkipRefresh(url, method)`** — Matches a request's pathname + method against `NO_REFRESH_ROUTES`.
- **`isAccountRead(request)`** — Identifies `GET /account` so a 403 there does not recursively trigger another ability reload.
- **`isIdleRefusal(error, body)`** — Detects the server's `SESSION_IDLE` code in a 401 body, signalling a staff session that sat past its idle limit.
- **`replayAsGuest(error, originalRequest)`** — Reissues the request with the `Authorization` header stripped and `_refreshed` set, so a dead-token request succeeds as an anonymous one.
- **`endCookieSession(error)`** — In `cookie` mode a 401 is terminal (no `/account/refresh` endpoint); signals expiry on the session store and rejects.

## Relationships

- **`client.ts`** — Imports `instance` (the shared Axios instance) to issue replayed requests.
- **`envelope.ts`** — Imports `getFirstApiError` to extract the API error code from a parsed response body (used by `isIdleRefusal`).
- **`interceptors.ts`** — Imports `onResponseReject` as the normalised rejection handler returned in every non-replay path.
- **`types.ts`** — Imports `AxiosRequestConfigWithRetry`, `AxiosResponseErrorBody`, `AxiosResponseErrorData` for typed error/config access.
- **`url.ts`** — Imports `toPathname` to normalise absolute/relative URLs before route matching.
- **`step-up.ts`** — Not imported directly, but interacts via the shared `_steppedUp` config flag. The `_refreshed` guard in this file deliberately does **not** block a step-up; a request may be refreshed once *and* stepped up once.

## Notes

- **Refresh logic lives elsewhere.** The actual token renewal (single-flight, epoch-guarded, session-ending) is `infrastructure/session.ts` → `refreshToken`. This module only decides *when* to call it and what to do with the result.
- **`_refreshed` is a loop guard, not a capability lock.** It prevents a second refresh or a second guest-replay, but a step-up interceptor (with its own `_steppedUp` flag) can still run after a refresh.
- **Cookie mode has no refresh.** A 401 means the session cookie is gone; there is no `POST /account/refresh` to call. The session ends immediately and the request is not replayed.
- **`replayAsGuest` must delete `Authorization` explicitly.** The spread copy of the original config still carries the stale header; clearing the session store does not mutate the in-flight config object.
- **403 → `reloadAbilities()` is fire-and-forget.** It never rejects (a failed read simply yields empty abilities), so the call is intentionally floating. The `GET /account` exclusion prevents a 403-on-403 loop.
