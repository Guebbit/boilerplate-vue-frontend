---
source: tests/unit/infrastructure/http/idempotency.spec.ts
sha256: e02b00c8beef46ef14f71c24243c27a60236edb4b2dbfe9904d839490735e7b0
signature: fc60e1df8013bfe7f2931fef3c0aad8c2530a2d31f80da1161da68e304b47b62
generated_at: 2026-11-10T07:58:35.612229+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/idempotency.spec.ts

## Purpose

Unit tests for the idempotency-key helpers in `@/infrastructure/http/idempotency.ts`. The central concern is the **keep-vs-mint decision**: a key retained too long causes duplicate charges/signups/sends; a key minted too eagerly causes the server to reject a retry as a reused key on a different body. These tests pin down exactly which response shapes trigger each outcome.

## Key elements

- **`keyOf(config)`** – Test-local helper that reads `config.headers[IDEMPOTENCY_KEY_HEADER]` from an `AxiosRequestConfig`. Uses a non-null assertion because `withKey` always sets `headers` but the Axios type marks it optional.
- **`TRANSPORT_FAILURE`** (`{ status: 0 }`) – Simulates a network-level failure (no response received).
- **`SERVER_FAILURE`** (`{ status: 503 }`) – Simulates a 5xx the API would store and replay for the same key.
- **`IN_FLIGHT`** (`{ status: 409, errors: [{ code: 'IDEMPOTENCY_IN_FLIGHT' }] }`) – Simulates the API's "first attempt still running" refusal.
- **`CLIENT_FAILURE`** (`{ status: 422 }`) – Simulates a definitive 4xx (validation, decline, etc.).
- **`describe('useIdempotencyKey')`** – Verifies: key is minted eagerly (before any call); caller's extra per-call options (`onUploadProgress`, custom headers) survive alongside the injected header; **same key** is returned after `TRANSPORT_FAILURE` and `IN_FLIGHT`; **fresh key** is returned after `SERVER_FAILURE`, a successful settle, and `CLIENT_FAILURE`.
- **`describe('useIdempotencyKeys')`** – Verifies per-subject isolation: same subject returns the same keeper; different subjects get independent keys.
- **`describe('sendKeyed')`** – Verifies the one-shot send helper applies the current key, mints a fresh one after a successful answer, and re-throws (without settling) on transport failure so the next call reuses the same key.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The file is a `@module` (no exports); it exists purely as a vitest spec.
- The `settle()` call with **no argument** represents a successful response (no status object).
- In the `sendKeyed` rejection test, an inline `eslint-disable` suppresses `prefer-promise-reject-errors` because the toolkit intentionally rejects with a plain `{ status }` shape (not an `Error`) that `keepsIdempotencyKey` inspects.
- `onUploadProgress` is a no-op stand-in; its identity is asserted to confirm the helper doesn't clobber caller-supplied per-call options.
