# src/infrastructure/http/interceptors.ts

## Purpose

Defines the four axios interceptor handlers that decorate outgoing requests (auth token, language) and normalize every incoming rejection into a single error-envelope shape. Token-refresh logic is deliberately kept out of this file.

## Key elements

- **`onRequest`** – Injects `Authorization: Bearer <token>` (from the session store) and `Accept-Language` into the request headers.
- **`onRequestReject`** – Passes transport/setup failures straight through; no transformation.
- **`onResponseReject`** – Catches any response error and rejects with a uniform `AxiosResponseErrorData` envelope. If the API already returned an `errors` field, it enriches it with `requestId`/`traceId`; otherwise it synthesizes the envelope using a fallback message.
- **`getFallbackMessage`** *(internal)* – Maps 401 / 403 / ≥500 to app-local i18n strings (`api-errors.*`); returns the caller-supplied fallback for everything else.
- **No response-success interceptor** – `response.data` unwrapping is intentionally left to `orvalMutator` so `instance.get<T>()` keeps its declared return type.

## Relationships

- **`src/infrastructure/http/types.ts`** – Supplies `AxiosRequestData`, `AxiosResponseErrorBody`, and `AxiosResponseErrorData`, the typed shapes used in the interceptor signatures and the rejection envelope.
- **`src/infrastructure/stores/session.ts`** – Source of `accessToken` via `useSessionStore`; `onRequest` reads it to build the `Authorization` header.
- **`src/infrastructure/http/refresh.ts`** – Handles token refresh / re-authentication flows; this file's module docstring explicitly defers to it.
- **`src/infrastructure/http/index.ts`** – Barrel / wiring module that attaches these four handlers onto the shared axios instance.

## Notes

- The rejection contract is the **envelope object**, not a thrown `Error`. Downstream `catch` blocks destructure it; two `eslint-disable` lines suppress the `prefer-promise-reject-errors` rule for this reason.
- 5xx responses are logged at **debug** level (`logger.debug('http', …)`) rather than error—opt in via `VITE_APP_LOG_SCOPES=http`.
- Fallback i18n keys live under `api-errors.*` in the **app's own** dictionary so they resolve even when the backend is unreachable or the locale isn't bundled.
- `requestId` / `traceId` are extracted from the `x-request-id` and `x-trace-id` response headers and spread into the envelope only when present.
