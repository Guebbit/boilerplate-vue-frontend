---
source: src/infrastructure/http/envelope.ts
sha256: fddd28c261fe896fed89c64b35e7b9cee0967e95a40e7bdc19a3bcca44cca297
signature: 8bb6eccf1377409d17abe3ed29a654729741bc0447147be1ecea45f276b18080
generated_at: 2026-11-10T03:03:11.058013+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/envelope.ts

## Purpose

Provides runtime type-guard readers for the `errors` array in an RFC 9457 problem-document rejection envelope. It exists at the transport layer because the problem shape is a property of the wire protocol: every refusal arrives in it, and none of that concern belongs in a session store. Success responses are not touched here — their body is the payload itself.

## Key elements

- **`ApiErrorItem`** — Interface for one structured error. `code` and `details` are both typed `unknown`; the shape is only asserted by generated types and never verified at runtime.
- **`isObjectRecord`** — Type guard narrowing `unknown` to `Record<string, unknown>` (non-null object).
- **`getFirstApiError(value)`** — Reads `errors[0]` off a rejection body. Returns `ApiErrorItem | undefined`. Handles the case where the body is a JSON string (see `parsedBody`).
- **`getRetryAfter(value, code)`** — Reads `details.retryAfter` (seconds) from a rejection whose `code` matches the given `ErrorCode`. Returns `number | undefined`.
- **`parsedBody`** (private) — If the raw body is a string, parses it via `parseJsonSafe`; otherwise passes it through. Needed because `responseType: 'text'` requests (orders CSV export) deliver even their error envelope as a string.

## Relationships

- **`src/infrastructure/http/step-up.ts`** — The `parsedBody` comment explicitly calls out a step-up challenge on a text-response request as the motivating case for string-body handling.
- **`src/infrastructure/http/antibot.ts`** / **`src/infrastructure/http/refresh.ts`** — Graph neighbors in the same HTTP infrastructure layer; they consume the rejection envelope readers exposed by this module.

## Notes

- `ApiErrorItem.code` and `.details` are deliberately `unknown`, not their generated types. Callers must narrow further; this module only guarantees the item is a plain object.
- An empty `errors` array is legal at the type level. `getFirstApiError` will return `undefined`; callers must handle that.
- `getRetryAfter` performs an exact `===` comparison on the code string. A mismatched code (or missing `details` object) silently yields `undefined` rather than throwing.
- This file is placed in infrastructure rather than a store by design: the problem-document shape is a transport concern, not session state.
