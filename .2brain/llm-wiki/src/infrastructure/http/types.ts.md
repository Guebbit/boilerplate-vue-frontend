---
source: src/infrastructure/http/types.ts
sha256: 5d7f9f05f22adce444c6d66ed6c3bc2ba485b7c282c7feef25ae107336818f50
generated_at: 2026-10-02T11:59:12.978989+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/types.ts

## Purpose

Shared type aliases for the HTTP tier. Defines the request/response payload shapes and the retry-loop-guard config extension that `interceptors.ts`, `refresh.ts`, and `step-up.ts` all reference, keeping the contract in one place.

## Key elements

- **`AxiosRequestData`** (`unknown`) — Deliberately unconstrained request payload type; generated clients send anything from JSON envelopes to `FormData`.
- **`AxiosResponseErrorData`** — The normalized shape every rejected request is lifted into: `ErrorResponse` (from `@/types`) plus four fields that come from headers or the request config rather than the body: `requestId` (`x-request-id` header), `traceparent` (W3C trace context header), `method` (upper-cased HTTP verb), `path` (pathname only, no origin/query, so identical routes group together). All optional.
- **`AxiosResponseErrorBody`** (`unknown`) — Raw error response body before normalization.
- **`AxiosRequestConfigWithRetry`** — `AxiosRequestConfig` extended with two optional boolean guards: `_refreshed` (blocks a second refresh-and-replay) and `_steppedUp` (blocks a second step-up-and-replay). Each guard is independent — one branch firing does not suppress the other.

## Relationships

- **`interceptors.ts`** — Consumes `AxiosResponseErrorData` to build the normalized rejection and `AxiosRequestConfigWithRetry` to read/write the guard flags during the interceptor pipeline.
- **`refresh.ts`** — Sets `_refreshed` on the replayed request and on its own 401-prone refresh call so the interceptor does not re-enter the refresh branch.
- **`step-up.ts`** — Sets `_steppedUp` on the replayed request so the step-up branch does not re-enter.
- **`validate.ts`** — References the error payload types when validating/shaping responses before they reach the normalization step.

## Notes

- `traceparent` is the only trace header used; `x-trace-id` is explicitly noted as never sent by either backend. Do not add it.
- `path` is intentionally stripped of origin and query string so all calls to the same route collapse into one group in Faro regardless of caller-supplied ids.
- The two retry guards are orthogonal: a request that has already been refreshed may still be stepped up once, and vice versa. Each flag is set by its own branch only.
- `AxiosRequestData` and `AxiosResponseErrorBody` are both `unknown` on purpose — they exist to type the "I don't know / anything goes" boundaries without forcing a concrete shape.
