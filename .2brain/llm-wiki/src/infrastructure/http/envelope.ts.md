---
source: src/infrastructure/http/envelope.ts
sha256: b88deb173f33e983d0b3a4645e25088c8a0ebdc470ebb5f534d5d645fe0f4cae
generated_at: 2026-10-17T00:09:14.433035+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/envelope.ts

## Purpose

Type-guard readers for the two response envelopes the API uses: the `{ data }` success wrapper and the `{ errors: [...] }` rejection list. Every function starts from `unknown` and narrows structurally, so no declared type is trusted past the wire. It lives in the transport layer (not a store) because the envelope shape is a property of the HTTP boundary, shared by all endpoints.

## Key elements

- **`ApiErrorItem`** – Interface describing one entry in the rejection `errors` array. Both `code` and `details` are typed `unknown`; the caller is responsible for narrowing.
- **`isObjectRecord(value)`** – Type guard: `true` when `value` is a non-null plain object. Used as the first narrowing step by every reader.
- **`isWrappedResponse<T>(response)`** *(internal)* – Type guard: `true` when the value is an object carrying a `data` key. Not exported.
- **`getTokenFromResponse(response?)`** – Extracts `data.token` (string) from a login/refresh response, or returns `undefined`.
- **`getPayloadFromResponse<T>(response?)`** – Unwraps `{ data }` envelopes; also passes through a direct (unwrapped) payload. Returns `T | undefined`.
- **`getFirstApiError(value)`** – Reads `errors[0]` off a rejection body. Returns an `ApiErrorItem` or `undefined`. Handles the case where the array is empty or the item is not an object.
- **`getRetryAfter(value, code)`** – Given a rejection and a stable `ErrorCode` (e.g. `EMAIL_VERIFY_RESEND_TOO_SOON`), returns the server-supplied `details.retryAfter` seconds, or `undefined`.

## Relationships

- **`src/infrastructure/http/antibot.ts`** – Same transport layer; expected consumer of `getRetryAfter` and `getFirstApiError` to surface rate-limit / cooldown responses.
- **`src/infrastructure/http/step-up.ts`** – Same transport layer; expected consumer of the envelope readers to detect reauth/step-up rejections and extract payloads.
- **`@api/error-codes`** (type-only import) – Provides the `ErrorCode` union used by `getRetryAfter` to match against `ApiErrorItem.code`.

## Notes

- All public readers accept `unknown` (or `undefined`) as input and return `undefined` on any shape mismatch — callers must handle the absent-value case.
- `isWrappedResponse` is intentionally **not** exported; consumers should go through the named helpers (`getPayloadFromResponse`, `getTokenFromResponse`) rather than re-implementing the check.
- An empty `errors` array is valid at the type level, so `getFirstApiError` can legitimately return `undefined` even for a well-formed rejection body.
- The file carries an explicit `// eslint-disable-next-line` on `isWrappedResponse` for the `no-unnecessary-type-parameters` rule — the type parameter exists to name the caller's payload in the predicate; don't remove it without replacing the narrowing.
