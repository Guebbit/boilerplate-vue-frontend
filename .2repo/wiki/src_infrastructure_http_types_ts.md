# src/infrastructure/http/types.ts

## Purpose

Central type-alias definitions for the HTTP infrastructure layer. It pins down the payload shapes (request data, error bodies, error envelopes) and the retry-loop-guard config extension so that `interceptors.ts`, `refresh.ts`, and `index.ts` share a single source of truth instead of repeating inline type assertions.

## Key elements

- **`AxiosRequestData`** — alias for `unknown`. Deliberately unconstrained because generated clients send anything from JSON envelopes to `FormData`.
- **`AxiosResponseErrorData`** — alias for `ResponseReject` (from `@/types`). The normalized shape every rejected response is coerced to after the backend reject envelope is parsed.
- **`AxiosResponseErrorBody`** — alias for `unknown`. Represents the raw, pre-normalization error body before any interceptor transforms it.
- **`AxiosRequestConfigWithRetry`** — intersection type extending `AxiosRequestConfig` with an optional `_dontRetry?: boolean` flag. Used to opt a single request out of the retry/refresh loop.

## Relationships

- **`src/infrastructure/http/interceptors.ts`** — consumes `AxiosResponseErrorData` / `AxiosResponseErrorBody` to type the error-handling and normalization logic inside request/response interceptors.
- **`src/infrastructure/http/refresh.ts`** — consumes `AxiosRequestConfigWithRetry` to set `_dontRetry` on the refresh call itself, preventing an infinite retry→refresh→retry loop.

## Notes

- `_dontRetry` is intentionally prefixed with an underscore to signal it is an internal transport concern, not a real Axios option. It lives on the config object rather than as a separate parameter so it travels with the request through interceptors without any plumbing.
- `AxiosRequestData` being `unknown` (not `any`) means consumers must narrow before use; treat it as a type-level "trust nothing" boundary at the HTTP layer.
- The module is pure types — no runtime code, no side effects. Safe to import anywhere without bundle impact.
