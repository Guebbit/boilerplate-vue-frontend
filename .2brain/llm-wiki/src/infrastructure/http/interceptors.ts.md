---
source: src/infrastructure/http/interceptors.ts
sha256: 76c79cb85c10194b54f956777c78eecfa2a19ccb8d8f3f1b3c64a229c23d8709
signature: 5fd6bb7fd43cf78d7471194b370c9b64a931d9c7839466cd5223d3ef02c60955
generated_at: 2026-11-10T03:04:51.591569+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/interceptors.ts

## Purpose

Defines the axios request/response interceptors for the application's HTTP client. On the request path it injects the bearer token, the active locale, session-activity signalling, and (for anonymous callers only) the guest's analytics-consent header. On the response path it normalises every failure—transport loss, proxy error, or API problem detail—into one consistent rejection envelope that downstream `catch` blocks can destructure uniformly.

## Key elements

- **`onRequest`** (exported) – Request interceptor. Sets `Authorization` (if a token exists), `Accept-Language`, calls `useSessionStore().noteActivity()` for non-passive authenticated requests, and adds `Analytics-Consent: true` only when the caller is anonymous *and* the guest has granted consent.
- **`onRequestReject`** (exported) – Pass-through; re-rejects the error unchanged.
- **`onResponseReject`** (exported) – Response-error interceptor. Reads the body via `readProblemBody` (handles `text`/`blob` response types), then delegates to the internal `rejectionOf` to produce a single `AxiosResponseErrorData` shape.
- **`rejectionOf`** (internal) – Builds the final rejection object. Three branches: (1) body already has an `errors` array → enrich with correlation + lift fields; (2) no `response` at all → synthesize a `status: 0` transport error with a `TIMEOUT`/`CANCELED`/`NETWORK_ERROR` code; (3) has a response but no `errors` → synthesize a problem via `syntheticProblem`. All branches merge in `requestId`, `traceparent`, `method`, and `path`.
- **`getFallbackMessage` / `getFallbackErrorCode`** (internal) – Map 401 → `UNAUTHORIZED`, 403 → `FORBIDDEN`, 5xx → `INTERNAL_SERVER_ERROR`, everything else → generic client error. Messages come from the client's own `api-errors.*` i18n keys so they survive an unreachable backend.
- **`getTransportErrorCode`** (internal) – Distinguishes `TIMEOUT`, `CANCELED`, and `NETWORK_ERROR` for errors with no HTTP response.
- **`withFieldLifted`** (internal) – Lifts `details.field` to a top-level `field` on each error item so the form toolkit's `applyServerErrors` can match it.

## Relationships

- **`src/infrastructure/http/index.ts`** – Barrel file that re-exports the three interceptor functions (`onRequest`, `onRequestReject`, `onResponseReject`) so the shared axios instance can be wired up in one place without reaching into this module's internals.

## Notes

- There is **deliberately no response-success interceptor**. Unwrapping `response.data` here would make `instance.get<T>()` lie about its return type. The sanctioned unwrap point is `orvalMutator`.
- `Analytics-Consent` is sent **only for anonymous callers**. For signed-in users the backend's stored `analyticsConsent` field takes precedence; forwarding a stale guest header could re-grant tracking the user denied in their profile.
- 5xx responses are logged at `debug` level (scope `http`) rather than `error`, since they are the server's fault. Opt in with `VITE_APP_LOG_SCOPES=http`.
- The `traceparent` header (W3C trace context) is used for correlation. Neither backend sends `x-trace-id`, so that legacy header is not read.
- Transport failures (offline, CORS, timeout) are rejected with `status: 0`, which `isTransportFailure` in `utils/errors.ts` keys on—callers must not treat them as 5xx.
- Several `Promise.reject` calls carry an eslint-disable for `prefer-promise-reject-errors` because the rejection value is the API's problem-details object, not an `Error` instance; every downstream `catch` destructures the envelope shape.
