---
source: src/infrastructure/http/types.ts
sha256: 63c181ebb870c0bbf6059aa058bc0053a1d45465398ee51e3158c6af72ae8958
signature: 2a7d9663a2c775c9266d70c84eeed8330709e8d02f50e5ada2b810edac9c8a73
generated_at: 2026-11-10T03:06:45.490753+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/types.ts

## Purpose

Defines the shared type aliases for the HTTP tier: the request/error payload shapes and the retry-loop-guard config extension. Centralizing these keeps `interceptors.ts`, `refresh.ts`, and `step-up.ts` in agreement on what a normalized error looks like and which flags mark a request as already retried.

## Key elements

- **`AxiosRequestData`** — Type alias for `unknown`. Deliberately unconstrained because generated clients send everything from JSON to `FormData`.
- **`AxiosResponseErrorData`** — The normalized rejection shape: `Problem` (from `@/types`) plus four optional fields (`requestId`, `traceparent`, `method`, `path`) lifted off headers/config by `onResponseReject`.
- **`AxiosResponseErrorBody`** — Type alias for `unknown`; the raw error body before normalization.
- **`AxiosRequestConfigWithRetry`** — Extends `AxiosRequestConfig` with two optional boolean guards: `_refreshed` and `_steppedUp`. Both are optional so normal call sites never set either; only the refresh and step-up branches do.

## Relationships

- **`interceptors.ts`** — Consumes all four types; attaches the header/config fields onto `AxiosResponseErrorData` in the rejection handler.
- **`refresh.ts`** — Sets `_refreshed: true` on the replayed request and on the refresh call itself (preventing the refresh call's own 401 from re-triggering refresh).
- **`step-up.ts`** — Sets `_steppedUp: true` on the replayed request to block a second step-up.

## Notes

- The two retry guards are **independent**: setting `_refreshed` does not block step-up and vice versa. A request may go through one refresh *and* one step-up, but not two of either.
- Underscore-prefixed names (`_refreshed`, `_steppedUp`) are the convention for these internal config flags; they are not part of the public Axios API.
- `path` is stored as pathname only (no origin, no query) so that all calls to the same route group together in Faro regardless of caller-supplied path parameters.
- Trace correlation uses W3C `traceparent`, not `x-trace-id` (the latter is not used by either backend).
- `AxiosRequestData` is `unknown`, not `any` — intentional strictness.
