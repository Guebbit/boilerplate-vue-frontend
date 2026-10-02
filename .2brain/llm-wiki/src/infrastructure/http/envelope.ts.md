---
source: src/infrastructure/http/envelope.ts
sha256: 8aa88b0cbcd265ad2d92b95acfdb9c8a89a29f09d32e30c432586ec5bf820bcd
generated_at: 2026-10-02T11:55:20.342349+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/envelope.ts

## Purpose

Type-guard readers for the two response envelopes the API uses: the `{ data }` success wrapper and the `{ errors: [...] }` rejection list. Everything is narrowed from `unknown` at the boundary — no declared type is trusted past the wire. Lives at the transport layer (not in a store) because the envelope shape is a property of the HTTP API, not of any particular domain.

## Key elements

- **`ApiErrorItem`** (exported interface) — one entry in the rejection `errors` array; `code` and `details` are both `unknown` by design.
- **`isObjectRecord`** (private) — narrows `unknown` to `Record<string, unknown>`; used as the first step of every guard below.
- **`isWrappedResponse<T>`** (private) — type predicate that a value is a `{ data?: T }` object.
- **`getTokenFromResponse`** (exported) — pulls `data.token` from a login/refresh response; returns `undefined` if absent.
- **`getPayloadFromResponse<T>`** (exported) — unwraps both `{ data: T }` and bare `T` shapes into a single `T | undefined`.
- **`getFirstApiError`** (exported) — safely reads `errors[0]` from a rejection value; returns `undefined` when the shape doesn't match (including empty arrays).
- **`getRetryAfter`** (exported) — given a rejection value and a stable `ErrorCode`, returns `details.retryAfter` as a number, or `undefined` if the code doesn't match or the field is missing.

## Relationships

- **`src/infrastructure/http/antibot.ts`** — consumes `getFirstApiError` / `getRetryAfter` to detect rate-limit or cooldown refusals and drive countdown UI.
- **`src/infrastructure/http/step-up.ts`** — consumes `getFirstApiError` to inspect rejection envelopes (e.g. `REAUTH_REQUIRED`) and decide whether to trigger a step-up flow.

## Notes

- `ApiErrorItem.code` and `.details` are deliberately `unknown`, not `string` / `object`. Generated types assert the shape but never verify it; callers must re-narrow before use.
- `getFirstApiError` handles the case where `errors` is an empty array (legal at the type level) — it returns `undefined` rather than throwing.
- `getPayloadFromResponse` accepts both wrapped and direct payloads so callers don't need to branch on whether the endpoint uses the envelope.
- The `eslint-disable` on `isWrappedResponse` is intentional: the generic parameter exists solely to name the caller's payload type in the narrowing predicate.
