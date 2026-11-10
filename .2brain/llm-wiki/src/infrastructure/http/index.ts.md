---
source: src/infrastructure/http/index.ts
sha256: df7dd006ae5c495d6c13086c74d1ca7d183f68b31098167dcfa7cbbeb9926ced
signature: 61eb7be1d6560ced1ec6f16d4108585ae507e7cc30e2fda0e2d50b4939f7d947
generated_at: 2026-11-10T03:04:18.439293+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/index.ts

## Purpose

Composition root of the HTTP tier. Imports every leaf module, registers the interceptors onto the shared axios instance in the correct order, and exports `orvalMutator` — the single function through which all generated-client requests flow. It is the tier's public surface: `orval.config.ts` points every generated client here, and interceptor specs import the re-exported handlers from this module.

## Key elements

- **`orvalMutator<T>(config, options?)`** — The one and only call-site into the shared axios instance. Merges `options` under `config` (with a deeper one-level headers merge), optionally validates the request against the REST contract (dev mode), delegates to `send`, and returns the unwrapped `response.data`.
- **`send<T>(request)`** *(internal)* — Calls `instance.request`, normalises bodiless 2xx / empty-JSON responses to `undefined` so `zod.void()` schemas pass, optionally validates the response, and returns the body.
- **Interceptor registration block** — Wires six handlers onto `instance.interceptors` in the order: `onRequest` → `onEtagRequest` (request side); `onEtagResponse` → `onDownloadResponse` → `onResponseRejectWithStepUp` (response side, the last as an error-only handler).
- **Re-exports** — `onRequest`, `onRequestReject`, `onResponseReject` from `./interceptors.ts`, so test specs can import them through this module.

## Relationships

- **`src/infrastructure/http/client.ts`** — Source of the shared `instance` (axios) that all interceptors and `send` operate on.
- **`src/infrastructure/http/interceptors.ts`** — Supplies the auth / request-handling interceptors; three of its exports are re-exported here for test access.
- **`src/infrastructure/http/etag.ts`** — Supplies `onEtagRequest` / `onEtagResponse` for conditional-request caching.
- **`src/infrastructure/http/download.ts`** — Supplies `onDownloadResponse`, which converts `Content-Disposition` blobs into `File` objects.
- **`src/infrastructure/http/step-up.ts`** — Supplies `onResponseRejectWithStepUp`, catching `REAUTH_REQUIRED` 401s before the refresh logic in interceptors would incorrectly try to renew a cookie.
- **`src/infrastructure/http/validate.ts`** — Supplies the four validation helpers used by `orvalMutator` and `send`.
- **`contracts/rest/index.ts`** — The Zod schemas that `validate.ts` checks against; this file is the enforcement point.
- **`src/modules/account/tests/addresses.spec.ts`, `auth-login-mfa.spec.ts`, `auth-login-restore.spec.ts`, `auth-session.spec.ts`, `auth-signup.spec.ts`, `oauth-links-store.spec.ts`, `password-breach-hint.spec.ts`, `profile-account-consent.spec.ts`** — Import the re-exported interceptors (and exercise `orvalMutator`) through this module rather than reaching into leaf files directly.

## Notes

- **Single entry point.** `orvalMutator` is the *only* function permitted to call `instance.request`. Hand-written API calls must go through it as well, keeping response-unwrapping and behaviour configuration in one place.
- **Headers merge depth.** The merge is `{ ...options?.headers, ...config.headers }` (one level below the top-level spread). A naïve top-level spread would clobber caller-supplied headers on every bodied request because the generated client sets `Content-Type`, including the multipart boundary.
- **Bodiless-response guard.** A `204` or an empty-string body on a JSON-typed response is coerced to `undefined` before validation; text and blob downloads may legitimately be empty and are left alone.
- **Validation is async-safe.** `validateRequestAgainstContract` runs inside `Promise.resolve().then(…)` so a dev-mode `throw` lands in the caller's `.catch` instead of escaping synchronously.
- **`options` parameter convention.** The second argument to `orvalMutator` is orval's "second arg" slot; declaring it gives every generated function an optional `options` parameter for per-call overrides (`signal`, `onUploadProgress`, etc.) without bypassing the mutator.
- **Interceptor order is load-bearing for step-up.** The step-up handler is registered *last* on the response-reject chain so it sees the error after (not before) any prior error handlers; reordering can mask `REAUTH_REQUIRED` behind a refresh attempt.
