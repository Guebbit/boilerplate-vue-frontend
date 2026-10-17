---
source: tests/unit/infrastructure/http/idempotency.spec.ts
sha256: 8c1fe97d82f9d50b821957cde455854343cb6b0300cf6740571dab9ca5664953
generated_at: 2026-10-17T02:36:20.108096+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/idempotency.spec.ts

## Purpose

Unit tests for `useIdempotencyKey`, the helper that attaches an idempotency-key header to outgoing HTTP requests and decides whether to reuse or regenerate that key after each response. The tests lock down two critical behaviors: the key must be **kept** across retryable failures (transport errors, 5xx) and **regenerated** after definitive outcomes (success, 4xx). Getting either side wrong causes either duplicate charges or server-side "reused key" rejections.

## Key elements

- **`keyOf(config)`** — Small helper that extracts the idempotency-key header value from an `AxiosRequestConfig` for assertion. Uses a non-null assertion on `config.headers` because `withKey` always populates it, even though the type marks it optional.
- **`TRANSPORT_FAILURE`** (`{ status: 0 }`) — Fixture representing a network-level failure (the "nothing conclusive happened" case).
- **`SERVER_FAILURE`** (`{ status: 503 }`) — Fixture representing a retryable 5xx response.
- **`CLIENT_FAILURE`** (`{ status: 422 }`) — Fixture representing a definitive 4xx refusal (e.g. validation error, duplicate email).
- **`onUploadProgress`** — No-op stand-in for a real per-call option (like the one `signup` attaches) to verify option passthrough.
- **`describe('useIdempotencyKey')` block** — Six test cases:
  - Key is minted immediately (before any call).
  - Caller's other per-call options (e.g. custom headers, `onUploadProgress`) are preserved alongside the header.
  - **Same** key is returned after `settle(TRANSPORT_FAILURE)`.
  - **Same** key is returned after `settle(SERVER_FAILURE)`.
  - **Fresh** key is returned after `settle()` (success).
  - **Fresh** key is returned after `settle(CLIENT_FAILURE)`.

## Relationships

- Imports `useIdempotencyKey` and `IDEMPOTENCY_KEY_HEADER` from `@/infrastructure/http/idempotency.ts` (the module under test). No other graph neighbors are present.

## Notes

- `settle()` with **no arguments** is the convention for "the call succeeded." All retryable-failure tests pass an explicit status-code object.
- The fixtures are deliberately minimal (a single `status` field) because `isRetryableFailure` only inspects the status shape. Adding more fields to the fixtures would not increase coverage of the tested contract.
- The `!` non-null assertion in `keyOf` is a test-file-only convenience; it does not indicate that `withKey` can return a config without headers.
