# src/infrastructure/http/interceptors.ts

## Purpose

Defines the axios request/response interceptors for this application's HTTP layer. On the way out it attaches the session bearer token and active language; on the way back it normalizes every rejection into a single `AxiosResponseErrorData` envelope so downstream `catch` blocks can destructure uniformly. Token-refresh logic is explicitly out of scope here (delegated to `refresh.ts`).

## Key elements

- **`onRequest`** – Request interceptor. Reads `accessToken` from the Pinia session store and sets `Authorization: Bearer …` when present; always sets `Accept-Language` from the current i18n locale.
- **`onRequestReject`** – Request-error interceptor. Pure passthrough (`Promise.reject(error)`); exists so the interceptor chain stays symmetric.
- **`onResponseReject`** – Response-error interceptor. If the response already carries the API's `errors` field, it passes through enriched with `x-request-id` / `x-trace-id`. Otherwise (transport failure, bare proxy 502, etc.) it synthesizes the full envelope with a canonical `message`, an optional `errors[]` array (populated only for 401/403), and correlation IDs.
- **`getFallbackMessage`** (private) – Maps 401 → `api-errors.unauthorized`, 403 → `api-errors.forbidden`, ≥500 → `api-errors.internal-server-error`; returns the caller-supplied fallback for everything else.
- **`getFallbackErrorCode`** (private) – Returns `'UNAUTHORIZED'` or `'FORBIDDEN'` for the two statuses that synthesize a structured error item.
- **No response-success interceptor** – Deliberately absent. Unwrapping to `response.data` here would break `AxiosResponse<T>` return types; the sanctioned unwrap point is `orvalMutator`.

## Relationships

- **`src/infrastructure/http/types.ts`** – Provides the `AxiosRequestData`, `AxiosResponseErrorBody`, and `AxiosResponseErrorData` generic types that parameterize the interceptor signatures and define the rejection envelope contract.
- **`src/infrastructure/http/refresh.ts`** – Handles the 401 token-refresh flow. This file's docstring explicitly defers to it; `onResponseReject` does *not* trigger a refresh, it simply normalizes the 401 into the envelope for the caller (or refresh hook) to react to.
- **`src/infrastructure/http/index.ts`** – Expected to import and register these four exports on the shared axios instance (wiring `onRequest` / `onRequestReject` / `onResponseReject` into `interceptors.request` / `interceptors.response`).

## Notes

- The i18n keys under `api-errors.*` live in the **client's own** dictionary, not the API's, because they must resolve even when the backend is unreachable (e.g., a 502 from a proxy). This means they survive a missing locale bundle that might still be present as a local override.
- 5xx responses are logged at `logger.debug` scope (`'http'`), not `error` — the rationale is "server's problem, not the client's." Opt in with `VITE_APP_LOG_SCOPES=http` to see them.
- The rejection value is a **plain object**, not an `Error` instance. Two eslint-disable comments mark this as intentional: the envelope shape is the de facto contract every downstream `catch` destructures.
- `onResponseReject` returns `Promise<never>` — it never resolves, only rejects.
