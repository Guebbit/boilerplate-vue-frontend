---
source: src/infrastructure/http/step-up.ts
sha256: 482b56395ab79da9a36bf801e4b328afe1509f0adf72372687dfdc766fd54b35
generated_at: 2026-10-02T11:58:56.294649+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/step-up.ts

## Purpose

Response interceptor that handles the step-up (re-auth) flow. When the API returns a `REAUTH_REQUIRED` 401, it parks the failed request, shows a single `ReauthDialog` prompt, and replays the request once a fresh session is established. All other 401s are passed through to the standard refresh-and-retry path unchanged. It exists to intercept the step-up error *before* the generic refresh interceptor can "fix" the 401 with a token refresh that would simply produce the same error again.

## Key elements

- **`requestFreshSession`** — `singleFlight`-wrapped call to `useReauthPromptStore().requestStepUp()`. Guarantees exactly one dialog regardless of how many concurrent requests hit `REAUTH_REQUIRED`. Resolves when a fresh session exists; rejects if the user dismisses the prompt.
- **`onResponseRejectWithStepUp(error)`** (exported) — The interceptor function. Checks three conditions: status is 401, the API error code is `REAUTH_REQUIRED`, and the request hasn't already been stepped up (`_steppedUp` flag). If all pass, it awaits `requestFreshSession`, then replays the original request via `instance.request` with `_steppedUp: true`. On prompt dismissal it falls through to `onResponseReject`. Otherwise it delegates to `onResponseRejectWithRefresh`.

## Relationships

- **`client.ts`** — imports `instance` (the shared Axios instance) to replay the parked request.
- **`envelope.ts`** — imports `getFirstApiError` to extract the structured error code from the response body.
- **`interceptors.ts`** — imports `onResponseReject` as the terminal fallback when the user closes the prompt without re-authenticating.
- **`refresh.ts`** — imports `onResponseRejectWithRefresh`; every non-step-up 401 is handed off here. Ordering in the interceptor chain is critical: this file must run *before* `refresh.ts`'s handler sees the 401.
- **`reauth-prompt.ts`** — imports `useReauthPromptStore` (Pinia store) to trigger the dialog and await session establishment.
- **`single-flight.ts`** — imports `singleFlight` to deduplicate concurrent re-auth prompts into one.
- **`types.ts`** — imports `AxiosRequestConfigWithRetry`, `AxiosResponseErrorBody`, `AxiosResponseErrorData` for type annotations.

## Notes

- **Interceptor ordering is load-bearing.** `REAUTH_REQUIRED` is still a 401; if the refresh interceptor runs first it will successfully refresh the token, replay the request, and get `REAUTH_REQUIRED` back with no further recourse. This interceptor must be registered to see the error code first.
- **`_steppedUp` flag** prevents an infinite replay loop: the replayed request carries `_steppedUp: true`, so even if the server still rejects, the step-up branch is skipped and the error falls through to `onResponseReject`.
- The file does **not** intercept any status other than 401, nor any error code other than `REAUTH_REQUIRED`. Everything else is opaque passthrough.
