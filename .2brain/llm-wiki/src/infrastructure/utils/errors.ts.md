---
source: src/infrastructure/utils/errors.ts
sha256: d8396f476ed170920f6ff68565425ae79e28771539a6e8dc3aa2fcdca7c264c6
generated_at: 2026-10-02T14:42:10.354529+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/errors.ts

## Purpose

Shared, app-level error-classification and messaging helpers. It centralises "what message to show the user" (binding the toolkit's `extractErrorMessage` to the app's translated fallback), "what kind of failure happened" (transport vs. answered, retryable vs. final, absent vs. error), and the single toast + Faro-report call that ambient/background failures should make. Keeping all of this here ensures every call site speaks the same language and applies the same status-code semantics.

## Key elements

- **`firstApiMessage`** *(internal)* – Reads `errors[0].message` off the API reject envelope; returns the backend's own translated sentence or `undefined`.
- **`getErrorMessage`** – Public. `firstApiMessage ?? extractErrorMessage(error, translate('api-errors.unknown'))`. The one place the generic "something went wrong" fallback is injected. Exported for `use-blocking-error.ts`.
- **`isTransportFailure`** – `true` when the error is `null`, not an object, has no numeric `status`, or `status === 0` (the sentinel `onResponseReject` writes when no response ever arrived).
- **`absentIs(error, ...statuses)`** – `true` when the API *answered* with one of the given "absence" statuses (e.g. 404 → "no resource"), as opposed to a transport failure or a genuine error.
- **`rethrowUnlessAbsent(error, ...statuses)`** – If `absentIs` is false, rethrows the original error. Shared guard so stores can't accidentally swallow non-absence failures.
- **`isRetryableFailure`** – `true` for transport failures and 5xx (safe to retry under the same idempotency key). 4xx is *not* retryable.
- **`isPreconditionFailed`** – `true` for HTTP 412 (optimistic-lock / `If-Match` mismatch); caller must reload and reapply.
- **`isRateLimited`** – `true` for HTTP 429.
- **`notifyErrorMessages(addMessage, error)`** – Calls the caller's message sink with `getErrorMessage(error)`, then reports the raw error (stack intact) via `useObservabilityStore().captureException`. The ambient-failure path (toasts, background polls).

## Relationships

- **`@guebbit/js-toolkit`** – imports `extractErrorMessage`; this file supplies the translated fallback it would otherwise lack.
- **`@/infrastructure/observability/store.ts`** – imports `useObservabilityStore` for the Faro `captureException` call in `notifyErrorMessages`.
- **`@/i18n`** – imports `translate` to resolve the `api-errors.unknown` fallback string.
- **`src/infrastructure/utils/use-blocking-error.ts`** – consumes `getErrorMessage` for the blocked-workflow path (inline alert instead of toast).
- **`http/interceptors.ts`** – the producer of the reject envelope shape (`{ status, errors[] }`) that every function here parses.

## Notes

- The reject envelope's **top-level `message` is only the HTTP phrase** ("Unprocessable Entity"). The human-readable sentence lives at `errors[0].message`. Reading the top-level field was the historical bug that made all unmapped refusals look identical.
- `status: 0` is **not** a real HTTP code here; it is the sentinel `onResponseReject` writes exclusively when no response arrived. `isTransportFailure` treats it as transport failure; `absentIs` and the 4xx/5xx helpers exclude it.
- `notifyErrorMessages` is for **ambient** failures (list refresh, background poll). **Blocked** workflows (save, delete, refund, lookup) use `use-blocking-error.ts` instead — same wording, same Faro report, rendered via `InlineErrorAlert` rather than a toast. `docs/theory/request-flow.md` documents which path a given call site should take.
- `isRetryableFailure` encodes the B19 idempotency rule: 5xx and transport failures mean the server never acted, so reusing the same key is correct; 4xx means the server read and refused, so the next attempt is new and needs a fresh key.
