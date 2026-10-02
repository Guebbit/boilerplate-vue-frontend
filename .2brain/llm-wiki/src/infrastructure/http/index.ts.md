---
source: src/infrastructure/http/index.ts
sha256: 4301f5806b71fd23c58387720656f5bc94711ec460cb756f6873817caddfc227
generated_at: 2026-10-02T11:56:29.518756+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/index.ts

## Purpose

Composition root of the HTTP tier. Wires all request/response interceptors onto the shared axios instance at import time and exports `orvalMutator`, the single function through which every API call (generated or hand-written) is dispatched. This is the tier's public surface; `orval.config.ts` points all generated clients at `orvalMutator` here.

## Key elements

- **Interceptor wiring (top-level side effects):** Registers `onRequest` → `onEtagRequest` on the request chain, and `onEtagResponse` → `onResponseRejectWithStepUp` on the response chain, in that order.
- **`send<T>`** (module-private): Calls `instance.request`, optionally validates the response against its contract, and returns `response.data`.
- **`orvalMutator<T>(config, options?)`** (exported): The sole allowed caller of the shared axios instance. Merges `options` under `config` (config wins on conflict), merges headers one level deeper to preserve multipart boundaries, optionally validates the request against its contract, then delegates to `send`.
- **Re-exports:** `onRequest`, `onRequestReject`, `onResponseReject` from `./interceptors.ts` — exposed here so test specs can import them from the module's public surface.

## Relationships

- **`src/infrastructure/http/client.ts`** — provides the shared `instance` (axios) on which all interceptors are attached.
- **`src/infrastructure/http/interceptors.ts`** — supplies the auth/refresh interceptors (`onRequest`, `onRequestReject`) and the rejected `onResponseReject` that is re-exported.
- **`src/infrastructure/http/etag.ts`** — supplies `onEtagRequest` / `onEtagResponse` for conditional-request caching.
- **`src/infrastructure/http/step-up.ts`** — supplies `onResponseRejectWithStepUp`, which intercepts `REAUTH_REQUIRED` 401s before the refresh branch can misinterpret them.
- **`src/infrastructure/http/validate.ts`** — supplies the four validation helpers gated behind `shouldValidate*()` feature flags.
- **`contracts/rest/index.ts`** — the contract definitions that `validateRequestAgainstContract` / `validateResponseAgainstContract` check against.
- **`src/modules/account/tests/*.spec.ts`** — import `orvalMutator` and the re-exported interceptors through this module to exercise real HTTP paths in account-module tests.

## Notes

- `orvalMutator` is the **only** function permitted to call the shared axios instance directly; all other code must go through it.
- The second parameter (`options`) exists specifically to give orval-generated functions an `options?` argument so callers can pass per-call config (`signal`, `onUploadProgress`) without importing `orvalMutator` themselves.
- Header merge is deliberately one level (`options?.headers` under `config.headers`), not a top-level spread, to avoid dropping the multipart `Content-Type` boundary that generated body-callers set.
- The step-up interceptor is registered **after** the etag response interceptor so that a `REAUTH_REQUIRED` 401 is caught before the refresh branch would attempt to "fix" a cookie that was never the problem.
- Request/response contract validation is behind runtime feature flags; a validation failure in dev mode is thrown inside a Promise so it lands in `.catch` rather than escaping synchronously.
