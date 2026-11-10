---
source: src/infrastructure/utils/errors.ts
sha256: 0e248c8c7feea7be3061c786a9e2b97e50f04a3c15ca5e35f11eb325b47cea3a
signature: 5f0d4288049266ecef3d6e778ed3cd8b6306f51418adc2be80031c2e3e37e1bd
generated_at: 2026-11-10T03:11:30.803492+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/errors.ts

## Purpose

Shared error-handling primitives for the entire app. It turns an unknown rejected value (the RFC 9457 problem-details envelope from `onResponseReject`) into a user-facing sentence, classifies the failure (transport vs. answered, retryable, absent, idempotency-safe, etc.), and exposes the toast+Faro pair (`notifyErrorMessages`) that AMBIENT calls (list refreshes, background polls) use. Its sibling `useBlockingError` reuses `getErrorMessage` for BLOCKED workflows that render inline instead.

## Key elements

- **`getErrorMessage(error, fallback?)`** – Returns the best message: the API's own `errors[0].message` → `detail` → toolkit `extractErrorMessage` → i18n fallback. Exported for `useBlockingError` and `useAsyncAction`.
- **`isTransportFailure(error)`** – `true` when no HTTP response arrived (`status === 0` or missing). The only failures reported to Faro/Umami.
- **`absentIs(error, ...statuses)`** – `true` when the API *answered* with one of the given statuses (e.g. 404 = "nothing there").
- **`rethrowUnlessAbsent(error, ...statuses)`** – Catches an error; if it is not one of the listed "absence" statuses, rethrows. Shared by stores to prevent silently swallowing real failures.
- **`isRetryableFailure(error)`** – Transport failure **or** status ≥ 500. Safe to retry under the same idempotency key.
- **`keepsIdempotencyKey(error)`** – Narrower than the above: transport failure **or** `409 + IDEMPOTENCY_IN_FLIGHT`. A 5xx does *not* keep the key (the API replays the stored failure).
- **`hasErrorCode(error, ...codes)`** – Checks `errors[].code` in the envelope for specific API error codes.
- **`isPreconditionFailed(error)`** – Status 412 (ETag/`If-Match` mismatch); caller must reload, not resend.
- **`isRateLimited(error)`** – Status 429.
- **`notifyErrorMessages(addMessage, error)`** – Calls the message sink (toast/feedback store) with `getErrorMessage(error)`, then forwards the raw error to `useObservabilityStore().captureException()`.
- **`firstApiMessage`** (module-private) – Reads `errors[0].message` then `detail` from the envelope; deliberately ignores `title` to avoid surfacing untranslated status phrases.

## Relationships

- **`use-admin-observability.ts` / `use-audit-trail.ts`** (composables in `src/modules/observability/composables/`): consume the shared error-wording contract provided here. They call `notifyErrorMessages` (or `getErrorMessage`) so that admin-dashboard and audit-trail failures render the same sentence and report through the same Faro pipeline, keeping observability reporting consistent across ambient call sites.

## Notes

- **Two pairing paths, one wording.** AMBIENT failures → `notifyErrorMessages` (toast + Faro). BLOCKED failures → `useBlockingError` in `src/infrastructure/utils/use-blocking-error.ts` (inline `InlineErrorAlert` + Faro). Both call `getErrorMessage`, so the user sees identical text regardless of path.
- **`isRetryableFailure` ≠ `keepsIdempotencyKey`.** A 5xx is retryable *but* the idempotency key must be dropped (the server stored the failed attempt and will replay it). Only transport failures and `409 IDEMPOTENCY_IN_FLIGHT` preserve the key.
- **Fallback is i18n-bound.** The default fallback is `translate('api-errors.unknown')`; the toolkit intentionally returns `''` for unreadable rejections so the *tone* decision stays in app code, not in `@guebbit/js-toolkit`.
- **`absentIs` guards against transport failures.** A 404 on a dropped connection (status 0) is *not* treated as absence; the caller should retry, not show an empty state.
