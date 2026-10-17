---
source: src/infrastructure/http/index.ts
sha256: d58695c3b98df65f22c0e40b5a770dd22d8a33b5ad5f902a7a30dc2d92a681dc
generated_at: 2026-10-17T00:09:41.358080+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/index.ts

## Purpose

Composition root of the HTTP tier. It wires all interceptors onto the shared axios instance (from `client.ts`) and exports `orvalMutator` as the single function through which every API call—generated or hand-written—passes. `orval.config.ts` points all generated clients at this export, making this file the tier's public surface.

## Key elements

- **`orvalMutator<T>(config, options?)`** – The only function permitted to call the shared axios instance directly. Merges `options` into `config` (with a one-level-deeper header merge), optionally validates the request against a REST contract, delegates to `send`, and resolves with the unwrapped `response.data`.
- **`send<T>(request)`** *(internal)* – Calls `instance.request<T>` and unwraps `response.data`; runs `validateResponseAgainstContract` when response validation is enabled.
- **Interceptor wiring** – Registers, in order: `onRequest` → `onEtagRequest` (request side); `onEtagResponse` → `onResponseRejectWithStepUp` (response side).
- **Re-exports** – `onRequest`, `onRequestReject`, `onResponseReject` from `interceptors.ts`, exposed so test specs can import them through this module.

## Relationships

- **`src/infrastructure/http/client.ts`** – Supplies the shared `instance`; this file is the sole place its interceptors are registered.
- **`src/infrastructure/http/interceptors.ts`** – Source of `onRequest`, `onRequestReject` (wired) and `onResponseReject` (re-exported for tests).
- **`src/infrastructure/http/etag.ts`** – Source of `onEtagRequest` / `onEtagResponse`, wired here.
- **`src/infrastructure/http/step-up.ts`** – Source of `onResponseRejectWithStepUp`, wired as the final response-reject handler.
- **`src/infrastructure/http/validate.ts`** – Source of the four `should*` / `validate*` functions consumed by `orvalMutator` and `send`.
- **`contracts/rest/index.ts`** – REST contract definitions that the validation functions check requests/responses against.
- **`src/modules/account/tests/*.spec.ts`** – Account-module specs import `onRequest`, `onRequestReject`, `onResponseReject` through this module's re-exports rather than reaching into `interceptors.ts` directly.

## Notes

- **Interceptor order is load-bearing on the response side.** `onResponseRejectWithStepUp` must come *after* `onEtagResponse` so a `REAUTH_REQUIRED` 401 is intercepted before the refresh branch could renew a stale cookie.
- **Request-interceptor order is not load-bearing** between `onRequest` and `onEtagRequest` (the latter only adds a header), but they are kept adjacent for discoverability.
- **Header merge depth.** `orvalMutator` spreads `options.headers` and `config.headers` one level deeper than the top-level spread. This prevents a generated call's `Content-Type` from clobbering caller-supplied headers (e.g., a multipart `Content-Type` with a boundary).
- **`options` parameter.** Declaring the second parameter on `orvalMutator` gives every generated function an optional `options?` argument, the supported channel for per-call axios config (`signal`, `onUploadProgress`, etc.).
- **Validation is conditional.** `shouldValidateRequests` / `shouldValidateResponses` gate the contract checks, so they are presumably a dev/test-time toggle and cost nothing in production.
- **Validation throws are promise-safe.** Request validation runs inside `Promise.resolve().then(...)`, so a dev-mode throw lands in the caller's `.catch` rather than escaping synchronously.
