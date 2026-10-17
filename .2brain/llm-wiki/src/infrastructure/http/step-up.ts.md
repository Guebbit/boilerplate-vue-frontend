---
source: src/infrastructure/http/step-up.ts
sha256: b2b47a28a8aa6798ff7f65602814ab86b88ff745b3da0cf312dc7222f6007b03
generated_at: 2026-10-17T00:10:50.965820+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/step-up.ts

## Purpose

Response interceptor that handles the step-up authentication flow: when the server rejects a request with a `REAUTH_REQUIRED` 401, this file parks the request, surfaces a single reauth prompt, and replays the request once the visitor has re-proven their identity. All other 401s fall through to the standard refresh-and-retry path untouched.

## Key elements

- **`onResponseRejectWithStepUp`** (exported) — The sole public function. Inspects the error code; if it is `REAUTH_REQUIRED` and the request has not yet been stepped up, it triggers the prompt flow. Otherwise it delegates to `onResponseRejectWithRefresh`.
- **`requestFreshSession`** — A `singleFlight`-wrapped call to `useReauthPromptStore().requestStepUp(demandedMethods)`. Guarantees one dialog for N concurrent parked requests.
- **`demandedMethods`** (module-level) — Module-scoped array set to the first challenge's `details.methods` before the prompt opens. Parked requests that join the same prompt share the first one's demand.
- **`methodsOf`** — Extracts and validates the `methods` array from a `REAUTH_REQUIRED` error `details` object; returns `[]` when the challenge asks for recency alone.

## Relationships

- **`client.ts`** — Imports `instance` to replay the original request via `instance.request(...)` after the prompt resolves.
- **`envelope.ts`** — Uses `getFirstApiError` to pull `{ code, details }` from the response body and `isObjectRecord` to safely shape-check `details` inside `methodsOf`.
- **`interceptors.ts`** — Calls `onResponseReject` as the rejection handler when the visitor closes the prompt without re-authenticating.
- **`refresh.ts`** — Delegates every non-step-up 401 to `onResponseRejectWithRefresh`, preserving the existing token-refresh behaviour.
- **`reauth-prompt.ts`** — Calls `useReauthPromptStore().requestStepUp(...)` to open the `ReauthDialog.vue` prompt and await its resolution.
- **`single-flight.ts`** — Wraps `requestFreshSession` so concurrent `REAUTH_REQUIRED` 401s share one dialog rather than opening N.
- **`types.ts`** — Imports `AxiosRequestConfigWithRetry`, `AxiosResponseErrorBody`, and `AxiosResponseErrorData` for typed error/config handling.

## Notes

- **Interceptor ordering is critical.** A `REAUTH_REQUIRED` 401 is still a 401; if `onResponseRejectWithRefresh` sees it first, the refresh succeeds (the refresh cookie is still valid), the replay gets `REAUTH_REQUIRED` again, and the flow is stuck. This interceptor must be registered so it evaluates the error code *before* the refresh branch runs.
- **`_steppedUp` flag.** Set to `true` on the replayed config to prevent an infinite step-up loop if the server still returns `REAUTH_REQUIRED` after re-auth.
- **`demandedMethods` is write-once per prompt cycle.** Only the first request that *starts* the prompt reads it; later parked requests that join the same single-flight call inherit the first request's method list.
- **No interaction with `index.ts`** is visible in this file's imports; it is presumably re-exported there.
