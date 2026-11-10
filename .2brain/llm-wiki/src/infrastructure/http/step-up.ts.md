---
source: src/infrastructure/http/step-up.ts
sha256: 8fa60b585fa3d4474588ad071f5149637e47ff53ab0d6b5212a5eff105bdb474
signature: 3e3113bbac6659dcdcd2f9aaf58112e7e1e0e6a553c3aa7c615831af3d72c7fe
generated_at: 2026-11-10T03:06:29.385539+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/step-up.ts

## Purpose

Response interceptor that handles the step-up authentication flow. When the API returns a `401` with code `REAUTH_REQUIRED`, it parks the failing request, opens a single reauth dialog (single-flight), and replays the parked request once the user has re-proved their password. Every other `401` is delegated unchanged to the existing refresh-and-retry path.

## Key elements

- **`onResponseRejectWithStepUp(error)`** — The sole export. Reads the problem body, checks for `401` + `REAUTH_REQUIRED` + not-yet-stepped-up, then either triggers the step-up flow or falls through to `onResponseRejectWithRefresh`.
- **`requestFreshSession`** — A `singleFlight`-wrapped promise that calls `useReauthPromptStore().requestStepUp(demandedMethods)`. Guarantees one dialog for N concurrent parked requests.
- **`methodsOf(details)`** — Extracts the `methods` array (the additional proofs the challenge demands) from the error body's `details` field. Returns `[]` when absent.
- **`demandedMethods`** (module-level `let`) — Set immediately before `requestFreshSession` runs; only the caller that *starts* the prompt reads it, so subsequent parked requests inherit the first caller's demand.

## Relationships

- **`client.ts`** — Imports `instance` to re-issue the parked request after the fresh session is established.
- **`envelope.ts`** — Uses `getFirstApiError` and `isObjectRecord` to parse the problem body and extract `code` / `details`.
- **`interceptors.ts`** — Falls back to `onResponseReject` when the user dismisses the prompt without re-authenticating.
- **`problem.ts`** — Uses `readProblemBody` to normalize the raw response (handles `blob`/`text` responses that arrive unparsed).
- **`refresh.ts`** — Delegates every non-`REAUTH_REQUIRED` 401 to `onResponseRejectWithRefresh`.
- **`reauth-prompt.ts`** — Drives `useReauthPromptStore().requestStepUp()` to open the dialog and await a fresh session.
- **`single-flight.ts`** — Wraps `requestFreshSession` so concurrent 401s coalesce into one prompt.
- **`types.ts`** — Provides `AxiosRequestConfigWithRetry`, `AxiosResponseErrorData`, `AxiosResponseErrorBody`.

## Notes

- **Interceptor ordering is critical.** A `REAUTH_REQUIRED` 401 is still a 401; if the refresh interceptor sees it first, the refresh *succeeds* (the cookie is valid), the request replays, and the server returns `REAUTH_REQUIRED` again with no further recourse. This interceptor must run before `onResponseRejectWithRefresh` gets the chance to handle the status code.
- **`_steppedUp` flag** on the request config prevents an infinite loop: if the replayed request *still* gets `REAUTH_REQUIRED`, the flag short-circuits the step-up branch and the error falls through to the normal rejection path.
- **`demandedMethods` is mutable module state.** It is written by whichever request triggers the prompt first; later parked requests that join the same single-flight window share that value by design.
