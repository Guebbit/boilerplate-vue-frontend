---
source: src/infrastructure/utils/errors.ts
sha256: 946d960540d555e5c59ece057b717eb8e27151ec453f733bf4ca7cc5b56ec208
generated_at: 2026-10-17T00:12:56.189390+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/errors.ts

## Purpose

Shared error-handling utilities for the app: extracting a user-facing message from an unknown rejection, classifying failures as transport-level vs. answered, and providing the `notifyErrorMessages` toast + Faro report pair used by ambient (background) failure sites.

## Key elements

- **`firstApiMessage`** *(internal)* — pulls `errors[0].message` out of the reject envelope; the backend's translated sentence, not the HTTP phrase.
- **`getErrorMessage`** *(exported)* — best-effort user-facing string: `firstApiMessage` → toolkit `extractErrorMessage` → translated `"api-errors.unknown"` fallback. Shared with `useBlockingError`.
- **`isTransportFailure`** *(exported)* — `true` when no HTTP response arrived (missing `status` or `status === 0`).
- **`absentIs`** *(exported)* — `true` when the API answered with one of the caller-supplied "absence" statuses (e.g. 404).
- **`isRetryableFailure`** *(exported)* — `true` for transport failures or 5xx; safe to retry under the same idempotency key.
- **`rethrowUnlessAbsent`** *(exported)* — lets "absent" statuses pass, rethrows everything else; shared catch-block helper for stores.
- **`notifyErrorMessages`** *(exported)* — calls a toast/message sink with `getErrorMessage`, then reports the raw error to Faro via the observability store.
- **`isPreconditionFailed`** *(exported)* — `true` for HTTP 412 (record changed; caller must reload, not resend).
- **`isRateLimited`** *(exported)* — `true` for HTTP 429.

## Relationships

No graph neighbors are registered for this file.

## Notes

- **Two pairing sites, one wording.** `getErrorMessage` is the single source of the user-facing string. Ambient failures (list refresh, background poll) call `notifyErrorMessages` (toast + Faro). Blocked workflows (save, delete, refund, lookup) call `useBlockingError` (`src/infrastructure/utils/use-blocking-error.ts`), which renders the same string inline via `InlineErrorAlert` instead of toasting. See `docs/theory/request-flow.md` for which applies.
- **`status === 0` is a sentinel.** `onResponseReject` in `http/interceptors.ts` writes `status: 0` exclusively when no response object arrived; it never uses that value for an answered request.
- **Top-level `message` is not the user sentence.** The envelope's `message` is the HTTP phrase ("Unprocessable Entity"); the actionable text lives in `errors[0].message`. `firstApiMessage` targets the latter.
- **Fallback string is app-owned.** The generic "something went wrong" is translated through the app's i18n (`@/i18n`) so tone and language stay out of the shared `@guebbit/js-toolkit` package.
- **Retryability rule.** 5xx and transport failures are "no verdict" → same idempotency key is valid. 4xx is a final server decision → next attempt is a new one and needs a fresh key.
