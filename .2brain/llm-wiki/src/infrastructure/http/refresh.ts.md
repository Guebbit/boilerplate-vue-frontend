---
source: src/infrastructure/http/refresh.ts
sha256: 7d9682ab6c806326f015a5299a33b3ec94c3e07e864fdb5aed33f78ba63eb7ec
generated_at: 2026-10-02T11:57:51.439665+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/refresh.ts

## Purpose

Axios response-error interceptor that, on a 401 response (excluding auth-credential endpoints), calls the session's `refreshToken` exactly once and replays the original request with the new token. It is deliberately thin: all token-renewal, epoch-guarding, and session-teardown logic lives in `session.ts`; this module only decides *when* to call it and how to handle the result.

## Key elements

- **`REFRESH_EXCLUDED_PATHS`** – `Set<string>` of pathnames (login, signup, reset, 2FA) where a 401 is a genuine credential failure and must never trigger refresh-and-replay.
- **`shouldSkipRefresh(url)`** – Returns `true` when the URL's pathname (via `toPathname`) is in the excluded set.
- **`onResponseRejectWithRefresh(error)`** *(exported)* – The interceptor entry point. If the error is a 401, the request hasn't already been replayed (`_refreshed` is falsy), and the URL isn't excluded, it calls `refreshToken()` and, on success, re-issues the request through `instance.request` with `_refreshed: true`. On any non-401, a failed/tokenless refresh, or an already-replayed request, it delegates to `onResponseReject`.

## Relationships

- **`client.ts`** – Imports the shared Axios `instance` to issue the replayed request.
- **`interceptors.ts`** – Falls through to `onResponseReject` for every case that is *not* a qualifying 401 refresh (non-401 errors, excluded paths, already-replayed requests, failed refresh).
- **`url.ts`** – Uses `toPathname` to normalize absolute or relative URLs before the exclusion check.
- **`types.ts`** – Consumes `AxiosRequestConfigWithRetry` (adds the `_refreshed` flag) and the response-error type aliases.
- **`step-up.ts`** – No direct import, but shares the request-config flag convention: `_refreshed` (this module) and `_steppedUp` (step-up module) are independent guards, allowing a request to be refreshed once *and* stepped up once.
- **`session.ts`** *(imported, outside the listed neighbors)* – Provides `useSessionStore().refreshToken`; the sole owner of token-renewal, stale-result epoch checks, and session teardown.

## Notes

- **`_refreshed` is a one-shot loop guard**, not a general "already retried" flag. It does not suppress a subsequent step-up; the two guards are orthogonal.
- **2FA endpoints are excluded** because a wrong or expired code returns 401 by design. Without the exclusion, a visitor holding a stale-but-valid refresh cookie would get a silent token refresh and request replay instead of the expected "wrong code" error.
- This file never calls `clearSession` or performs the refresh HTTP call itself—those are responsibilities of `session.ts`. If the refresh returns no token, this module simply delegates to `onResponseReject` and lets the normal error path (which may end the session) take over.
