---
source: src/infrastructure/http/interceptors.ts
sha256: 7e5f3416ae40637ec7fc99439a6da79f61c23f066a2296715c74185207d7454a
generated_at: 2026-10-02T14:39:31.673392+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/interceptors.ts

## Purpose

Axios request/response interceptors that attach authentication, language, and anonymous analytics-consent headers on outbound requests, and normalize every rejection (transport failure, bare proxy error, or API error response) into a single `AxiosResponseErrorData` envelope shape on the way back. Refresh/step-up logic is deliberately excluded — it lives in `refresh.ts` / `step-up.ts`.

## Key elements

- **`onRequest`** (exported) – Sets `Authorization: Bearer …` when a token exists, always sets `Accept-Language`, and sets `X-Analytics-Consent: 'true'` only for unauthenticated requests where the guest has granted consent.
- **`onRequestReject`** (exported) – Pass-through; re-rejects the error unchanged.
- **`onResponseReject`** (exported) – The core normalizer. Three branches: (1) response already carries an `errors` array → enrich with correlation fields and lift per-item `field`; (2) no response at all → synthesize a `status: 0` transport-failure envelope; (3) response without `errors` → synthesize a minimal envelope with a fallback message. Always rejects with the envelope object (not an `Error` instance).
- **`getFallbackMessage`** (internal) – Maps 401/403/5xx to translated `api-errors.*` strings; returns the caller's fallback otherwise.
- **`getFallbackErrorCode`** (internal) – Returns `'UNAUTHORIZED'` or `'FORBIDDEN'` for synthesized `errors[]` entries.
- **`getTransportErrorCode`** (internal) – Classifies no-response errors into `TIMEOUT` | `CANCELED` | `NETWORK_ERROR`.
- **`withFieldLifted`** (internal) – Copies `item.details.field` to `item.field` so the form toolkit's `applyServerErrors` can bind it to the correct input.

## Relationships

- **`src/infrastructure/http/types.ts`** – Imports `AxiosRequestData`, `AxiosResponseErrorBody`, `AxiosResponseErrorData`; the envelope shape this file produces is defined there.
- **`src/infrastructure/http/url.ts`** – Imports `toPathname` to extract a clean path from `error.config.url` for the correlation block.
- **`src/infrastructure/http/refresh.ts`** – Explicitly *not* imported; the module doc states refresh logic belongs there, keeping this file's scope to header attachment and error normalization.
- **`src/infrastructure/http/index.ts`** – Consumes the exported `onRequest` / `onRequestReject` / `onResponseReject` to wire them into the shared axios instance.
- **`src/infrastructure/http/step-up.ts`** – Not directly referenced here; step-up auth is a separate concern.

## Notes

- **No response-success interceptor by design.** Unwrapping `response.data` here would make `instance.get<T>()` resolve to `T` while still typing as `AxiosResponse<T>`. The sanctioned unwrap point is `orvalMutator`.
- **Analytics-consent header is guest-only.** A signed-in user's consent is the backend's stored field; forwarding the stale guest header could re-grant tracking after a login.
- **Fallback i18n keys live in the app's own dictionary** (`api-errors.*`), not the backend's, so they resolve even when the API is fully unreachable.
- **`status: 0` signals "no server response"** (offline, timeout, CORS, cancel). Downstream code (`isTransportFailure`) keys on this to distinguish from a real 5xx.
- **5xx is logged at `debug` level** (scope `http`), not `error` — the server's fault, not the client's. Opt in via `VITE_APP_LOG_SCOPES=http`.
- **Rejections are plain objects, not `Error` instances.** Multiple `eslint-disable` lines suppress `@typescript-eslint/prefer-promise-reject-errors` because the envelope *is* the downstream contract; every `catch` destructures it.
- **Correlation uses `traceparent`**, not `x-trace-id` (neither backend has ever sent the latter).
