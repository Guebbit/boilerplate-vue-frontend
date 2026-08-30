# src/infrastructure/http/types.ts

## Purpose

Centralises the shared type aliases for the HTTP tier so that request-payload shapes, error-envelope shapes, and the retry-guard config extension are defined once and imported by the interceptors, refresh, and index modules.

## Key elements

- **`AxiosRequestData`** — Alias for `unknown`. Deliberately unconstrained because generated clients send heterogeneous payloads (JSON envelopes, `FormData`, etc.).
- **`AxiosResponseErrorData`** — Alias for `ResponseReject` (from `@/types`). The normalized shape every rejected request is reduced to by the backend reject envelope.
- **`AxiosResponseErrorBody`** — Alias for `unknown`. Represents the raw error response body *before* any normalization.
- **`AxiosRequestConfigWithRetry`** — `AxiosRequestConfig & { _dontRetry?: boolean }`. Extends Axios config with an optional guard flag so the refresh flow can opt a request out of the retry loop without affecting normal call sites.

## Relationships

- **`src/infrastructure/http/interceptors.ts`** — Imports these types to type the request/response interceptor handlers (e.g. reading `AxiosResponseErrorData` when normalizing rejections, checking `AxiosRequestConfigWithRetry._dontRetry` before re-dispatching).
- **`src/infrastructure/http/refresh.ts`** — Imports `AxiosRequestConfigWithRetry` to stamp the `_dontRetry` flag on requests issued during the token-refresh flow, preventing an infinite retry loop.

## Notes

- All four exports are **type-only** aliases; this file has no runtime code.
- `AxiosRequestData` and `AxiosResponseErrorBody` are `unknown` by design — they intentionally do **not** narrow the payload. Code consuming them must still perform their own shape checks.
- `_dontRetry` is the underscore-prefixed convention for "internal transport metadata" that Axios users should not set outside the refresh path.
