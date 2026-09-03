# src/infrastructure/http/index.ts

## Purpose

Composition root of the HTTP tier. Wires interceptors onto the shared axios instance at module load and exposes `orvalMutator` as the single function every generated (and hand-written) API call goes through. This is the tier's public surface: `orval.config.ts` points all generated clients here, and interceptor specs exercise them via the re-exports in this file.

## Key elements

- **`orvalMutator<T>(config, options?)`** — The sole allowed caller of the shared axios instance. Merges caller-supplied `options` under codegen-built `config` (config wins on conflict), sends the request, optionally validates the response against a contract, and resolves with `response.data`. Declaring the `options` parameter gives every generated function an `options?` arg for per-call overrides (`signal`, `onUploadProgress`, etc.).
- **`instance.interceptors.request.use(onRequest, onRequestReject)`** — Attaches request interceptors at import time.
- **`instance.interceptors.response.use(undefined, onResponseRejectWithRefresh)`** — Attaches the 401 refresh/retry interceptor.
- **Re-exports** — `onRequest`, `onRequestReject`, `onResponseReject` from `./interceptors.ts`, so test files can import them through this module.

## Relationships

- **`./client.ts`** — Provides the shared `instance` (axios) that this file configures and calls.
- **`./interceptors.ts`** — Supplies `onRequest`, `onRequestReject`; this file re-exports them alongside `onResponseReject` (which is applied as the response rejection handler).
- **`./refresh.ts`** — Provides `onResponseRejectWithRefresh`, wired as the response-rejection interceptor.
- **`./validate.ts`** — Provides `shouldValidateResponses()` and `validateResponseAgainstContract()`, invoked inside `orvalMutator` after a successful request.
- **`contracts/rest/index.ts`** — Consumed by `validate.ts` as the schema source for response validation (indirect dependency through `validate.ts`).
- **Module test files** (e.g. `src/modules/account/tests/*.spec.ts`, `src/modules/inventory/tests/store.spec.ts`, etc.) — Import interceptors through this module's re-exports rather than reaching into `interceptors.ts` directly.

## Notes

- **Header merge depth.** `headers` is spread one level deeper (`{ ...options?.headers, ...config.headers }`) instead of top-level. This is intentional: every generated call with a body sets `Content-Type` in `config.headers`, so a top-level merge would clobber caller-supplied headers (e.g. multipart `boundary`) on exactly the requests most likely to need them.
- **Validation is conditional.** `shouldValidateResponses()` gates the contract check, so production paths can skip it without modifying the mutator.
- **Single entry point.** The eslint-disable comment and the doc block both stress that no other code should call `instance` directly; all behaviour configuration is funneled through this one function.
