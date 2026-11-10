---
source: src/infrastructure/http/problem.ts
sha256: 40607392506af09b4d1d6e1854d4e76c6a105840d9e1bace24d2b67ea8441a9d
signature: d424fecf29c26dac43ed548c29e98362e194b488172d6be19bc9af18706fc689
generated_at: 2026-11-10T03:05:26.890096+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/problem.ts

## Purpose

Builds and reads RFC 9457 Problem Details objects on the client side, so that every rejection a caller catches has the same shape regardless of whether the server sent one or the client synthesised it (dropped connection, proxy error, contract violation). Also handles the edge case where a problem JSON body arrived as a raw string or Blob because axios was configured with a non-JSON `responseType`.

## Key elements

- **`syntheticProblem(status, title, code, message)`** — Returns a `Problem` object with `type: 'about:blank'` and exactly one entry in `errors`. The `message` argument is duplicated into both `detail` and the error item's `message`. Used whenever the client must produce a problem on its own (no server response available).
- **`readProblemBody(response)`** — Given an axios response (or response-like object with `data` + `headers`), returns the body as a parsed object **only** when `Content-Type` starts with `application/problem+json`. Handles three input shapes: already-parsed object (pass-through), string (parsed via `parseJsonSafe`), and `Blob` (converted via `.text()` then parsed). Returns the original `data` untouched for any other media type, so file downloads are never misread as JSON.

## Relationships

- **`src/infrastructure/http/interceptors.ts`** — The likely primary consumer: interceptors call `syntheticProblem` to wrap network/proxy failures and call `readProblemBody` to normalise a problem JSON body that arrived as text or Blob before rejecting the promise.
- **`src/infrastructure/http/validate.ts`** — May call `syntheticProblem` to produce a problem for contract violations detected client-side.
- **`src/infrastructure/http/step-up.ts`** — May call `syntheticProblem` when an authentication step-up cannot be performed.

## Notes

- `errors` always contains exactly one item by design; the type contract forbids an empty array.
- `status` is `0` (not `4xx`/`5xx`) when nothing answered at all (e.g., DNS failure, CORS preflight rejection).
- `readProblemBody` deliberately ignores `Content-Type` values that don't start with `application/problem+json`, protecting CSV/Blob download responses from being parsed.
- `parseJsonSafe` is reused from `safe-storage.ts`; a parse failure falls back to the original (string or Blob) value rather than throwing.
