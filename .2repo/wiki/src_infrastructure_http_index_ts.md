# src/infrastructure/http/index.ts

## Purpose

Composition root of the HTTP tier. Wires the request/response interceptors onto the shared axios instance and exposes `orvalMutator` as the single function every generated (or hand-written) API call goes through. `orval.config.ts` points all generated clients at this module, making it the tier's public surface.

## Key elements

- **`orvalMutator<T>(config, options?)`** — The only function permitted to call the shared axios `instance` directly. Merges per-call `options` with the codegen-built `config` (config wins on conflict), executes the request, optionally validates the response against a contract schema, and returns the unwrapped `response.data`.
- **Interceptor wiring** (module-level, runs once on import) — Attaches `onRequest` / `onRequestReject` as request interceptors and `onResponseRejectWithRefresh` as the response-error interceptor.
- **Re-exports** — `onRequest`, `onRequestReject`, `onResponseReject` are re-exported so that interceptor specs can import them through this module.

## Relationships

- **`./client.ts`** — Provides the shared `instance` (single axios instance) that `orvalMutator` calls and the interceptors attach to.
- **`./interceptors.ts`** — Supplies `onRequest`, `onRequestReject` (wired here) and `onResponseReject` (re-exported).
- **`./refresh.ts`** — Supplies `onResponseRejectWithRefresh`, wired as the response-error interceptor (handles 401 token refresh).
- **`./validate.ts`** — Supplies `shouldValidateResponses` and `validateResponseAgainstContract`, called inside `orvalMutator` after a successful response.
- **`./response-schema-map.ts`** — Downstream of `validate.ts`; provides the schema map used for contract validation.
- **`contracts/rest/index.ts`** — The contract definitions that `validateResponseAgainstContract` checks responses against.
- **`src/infrastructure/stores/session.ts`** — Consumed by the refresh flow to read/write the session token.
- **`src/modules/account/tests/*.spec.ts`** — Integration tests that exercise the full HTTP pipeline through this module's exports.

## Notes

- **Headers merge is one level deeper than a top-level spread.** Every generated call that carries a body sets `Content-Type`, so a flat `{...options, ...config}` merge would silently drop caller-supplied headers (e.g. the `multipart/form-data` boundary). The code spreads `options.headers` and `config.headers` separately into a new object.
- **`config` always wins over `options`.** The second parameter exists so callers can pass per-call axios config (`signal`, `onUploadProgress`) without touching `orvalMutator` directly; it is an escape hatch, not an override.
- **The `eslint-disable no-misused-spread` on the headers line is intentional** — AxiosHeaders' enumerable entries are exactly what an object spread copies, per axios docs.
- **Importing this module has a side effect:** it attaches interceptors to the shared instance. Tests that import it get the fully-wired instance; tests that import `./client.ts` directly get the bare one.
