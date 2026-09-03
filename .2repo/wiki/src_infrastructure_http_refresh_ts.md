# src/infrastructure/http/refresh.ts

## Purpose

Response interceptor that implements a single-retry token refresh flow: when a request fails with 401 (and the URL is not an auth endpoint), it calls `/account/refresh`, stores the new token, and replays the original request exactly once.

## Key elements

- **`REFRESH_EXCLUDED_PATHS`** — `Set` of auth paths (`/account/login`, `/account/signup`, `/account/reset`, `/account/reset-confirm`, `/account/logout-all`) where a 401 means genuine credential failure and must not trigger a refresh.
- **`shouldSkipRefresh(url?)`** — normalises the URL via `toPathname` and checks membership in the exclusion set.
- **`onResponseRejectWithRefresh(error)`** *(exported)* — the Axios response-error interceptor. On a qualifying 401 it issues a `GET /account/refresh` (flagged `_dontRetry: true`), extracts the token, persists it to the session store, and re-issues the original request. Any failure path falls through to `onResponseReject`.

## Relationships

- **`client.ts`** — imports the shared Axios `instance` to both make the refresh call and replay the original request.
- **`envelope.ts`** — imports `getTokenFromResponse` to pull the token out of the refresh response body.
- **`interceptors.ts`** — imports `onResponseReject` as the normal rejection handler used whenever the refresh is skipped or fails.
- **`url.ts`** — imports `toPathname` to normalise URLs before the exclusion-set lookup.
- **`types.ts`** — imports `AxiosRequestConfigWithRetry` (extends Axios config with `_dontRetry`) and the error-body/data generics.
- **`index.ts`** — barrel file for the `http` module; re-exports this interceptor for consumers.

## Notes

- **Loop guard**: the `_dontRetry` flag on `AxiosRequestConfigWithRetry` is the sole mechanism preventing an infinite 401 → refresh → 401 cycle. The refresh call itself and the replayed request both carry it.
- **Ordering matters**: the new token is written to the session store *before* the replay, because the request interceptor (in `interceptors.ts`) reads the token from that store.
- **200 ≠ success**: a 200 response from `/account/refresh` that carries no token is treated as a failed refresh and delegates to `onResponseReject`.
- The refresh endpoint is **not** in `REFRESH_EXCLUDED_PATHS`; it is protected solely by the `_dontRetry` flag.
