---
source: src/infrastructure/http/interceptors.ts
sha256: e94b68b72774bb432bb200a1b70c03d62814c320e3e5bbff3cef9f92466328e9
generated_at: 2026-10-17T00:09:57.288135+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/interceptors.ts

## Purpose

Defines the axios request/response interceptors that decorate outgoing requests with auth, locale, and analytics-consent headers, and normalize every rejection into a single error-envelope shape. Token refresh is deliberately absent (see `refresh.ts`).

## Key elements

- **`onRequest`** — Injects `Authorization` (Bearer token from the session store), `Accept-Language` (current i18n locale), session activity tracking (`noteActivity`), and `X-Analytics-Consent: 'true'` (guest requests only, when consent is granted).
- **`onRequestReject`** — Pass-through; forwards pre-dispatch errors unchanged.
- **`onResponseReject`** — The single error normalizer. Three branches:
  1. Response carries an `errors` array → pass through, enrich with correlation fields, lift each item's `details.field` to top-level via `withFieldLifted`.
  2. No response at all (offline, timeout, CORS, cancel) → synthesize envelope with `status: 0` and a code from `getTransportErrorCode`.
  3. Response exists but lacks `errors` (bare proxy 502, empty body) → synthesize a structured envelope using `getFallbackMessage` / `getFallbackErrorCode`.
- **`getFallbackMessage`** — Returns an i18n-translated message for 401 / 403 / 5xx; falls back to `statusText` or `error.message` otherwise.
- **`getFallbackErrorCode`** — Maps 401 → `UNAUTHORIZED`, 403 → `FORBIDDEN`.
- **`getTransportErrorCode`** — Classifies no-response axious errors: `TIMEOUT`, `CANCELED`, or `NETWORK_ERROR`.
- **`withFieldLifted`** — Copies `item.details.field` to top-level `field` so the form toolkit's `applyServerErrors` can bind it; leaves items untouched if `field` is already present or absent from `details`.
- **No response success interceptor** — Intentionally absent to preserve `AxiosResponse<T>` typing; `orvalMutator` is the sanctioned unwrap point.

## Relationships

- **`./types.ts`** — Imports `AxiosRequestData`, `AxiosResponseErrorBody`, `AxiosResponseErrorData` as the shared envelope/request data types.
- **`./url.ts`** — Imports `toPathname` to produce a stable path string for the correlation object on every rejection.
- **`./refresh.ts`** — Owns token-refresh logic; this file's `onRequestReject` simply passes errors through so that `refresh.ts` (wired at a different interceptor position by `index.ts`) can act on 401s before `onResponseReject` normalizes them.
- **`./index.ts`** — Expected consumer that registers `onRequest` / `onRequestReject` / `onResponseReject` onto the shared axios instance.
- **`./step-up.ts`** — No direct import in this file; interaction, if any, is mediated through the shared instance in `index.ts`.

## Notes

- The rejected value is the API's error **envelope object**, not an `Error` instance. Every downstream `catch` destructures `{ success, status, message, errors, requestId, … }`. The `eslint-disable prefer-promise-reject-errors` comments are intentional.
- `status: 0` is the contract signal for transport failure; `utils/errors.ts` (`isTransportFailure`) keys on it to distinguish "nothing answered" from a real 5xx.
- Analytics-consent header is **guest-only** on purpose: a signed-in user's consent lives in the backend's `analyticsConsent` field, and forwarding a stale guest cookie after login could silently re-grant tracking.
- Fallback messages use `api-errors.*` i18n keys (app-local dictionary) rather than the backend's text, so they remain correct even when the backend is unreachable and the locale copy was previously cached as overrides.
- Correlation object always includes `method` + `path`; `requestId` and `traceparent` (W3C trace context) are included only when present in response headers. No `x-trace-id` is expected.
