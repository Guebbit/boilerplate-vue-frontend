# src/infrastructure/http/refresh.ts

## Purpose

Response-error interceptor that implements a single-attempt token refresh-and-retry flow. When a 401 is received (outside a small set of auth endpoints), it calls the refresh endpoint, stores the new token, and replays the original request exactly once. This exists so callers never need to handle token expiry manually.

## Key elements

- **`onResponseRejectWithRefresh(error)`** *(exported)* — The 401 error interceptor. Guards against re-entry via `_dontRetry`, calls `/account/refresh`, extracts and stores the new token, then replays the original request. Falls through to `onResponseReject` on any failure path.
- **`refreshExcludedPaths`** — A `Set` of five auth-route pathnames (`/account/login`, `/account/signup`, `/account/reset`, `/account/reset-confirm`, `/account/logout-all`) where a 401 means a genuine credential failure and must not trigger refresh.
- **`shouldSkipRefresh(url?)`** — Normalises the URL via `toPathname` and checks membership in the exclusion set.

## Relationships

- **`client.ts`** — Imports the shared Axios `instance` to issue the refresh GET and to replay the original request.
- **`envelope.ts`** — Uses `getTokenFromResponse` to pull the new token out of the refresh response envelope.
- **`interceptors.ts`** — Delegates to `onResponseReject` as the fallback/normalisation path when refresh is skipped or fails.
- **`url.ts`** — Uses `toPathname` to extract the pathname portion of the request URL for exclusion matching.
- **`types.ts`** — Imports the extended config (`AxiosRequestConfigWithRetry`) and error-body types used to type the interceptor parameters.
- **`index.ts`** — Barrel re-export; consumers import `onResponseRejectWithRefresh` through the package entry point rather than this file directly.

## Notes

- **Loop guard:** The `_dontRetry` flag on the Axios config is the sole mechanism preventing a 401 *on the refresh call itself* from re-triggering refresh. It is a custom property, not a standard Axios option.
- **Ordering matters:** The token is written to `useSessionStore` **before** the replayed request is issued, because the request interceptor (in `interceptors.ts`) reads the token from that store.
- **200-with-no-token:** A refresh response that returns HTTP 200 but carries no extractable token is treated as a failed refresh and routed to the standard rejection path.
- **Exclusion list is hardcoded:** New auth endpoints that should bypass refresh must be added to `refreshExcludedPaths` manually.
