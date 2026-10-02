---
source: src/infrastructure/http/idempotency.ts
sha256: 7a0328f3fb861ac2a244371c301f2dce99cb18a1455e1248bfe9640cf725d53d
generated_at: 2026-10-02T11:56:05.074546+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/idempotency.ts

## Purpose

Provides a Vue reactive helper for managing a single `Idempotency-Key` header across retries of the same user intent. It mints a UUID at creation, reuses it through retryable failures (transport errors, 5xx), and replaces it after any definitive answer (success or 4xx), so the backend's idempotency middleware can deduplicate exactly the attempts it should.

## Key elements

- **`IDEMPOTENCY_KEY_HEADER`** — exported constant (`'Idempotency-Key'`); the exact header name the paired backend's `idempotency` middleware reads.
- **`IdempotencyKeyKeeper`** — interface exposing two methods:
  - `withKey(options?)` — returns a shallow-copied `AxiosRequestConfig` with the current key merged into `headers` (preserving any pre-existing headers, e.g. an antibot token).
  - `settle(error?)` — settles the guarded attempt: keeps the current key when `error` is retryable; mints a fresh UUID on success or non-retryable failure.
- **`useIdempotencyKey()`** — composable factory. Returns a keeper scoped to the caller. The key is minted eagerly (`crypto.randomUUID()`) so the very first call already carries one.

## Relationships

- **`src/infrastructure/utils/errors.ts`** — imports `isRetryableFailure`, the predicate that decides whether a rejected value means "nothing conclusive happened server-side" (retry → keep key) vs. "definitive answer" (settle → mint new key).
- The listed graph neighbor `src/infrastructure/utils/logger.ts` has no visible import or interaction in this file.

## Notes

- One keeper per **distinct user intent** (a signup, one payment step, one contact-form submission). Do not share a keeper across unrelated calls.
- The header-merge shape intentionally mirrors `withAntibotToken` (`infrastructure/http/antibot.ts`); callers chain them so both headers land in the same config object.
- The cart store carries its own copy (`checkoutIdempotencyKey`, B19) rather than importing this helper, to keep the `checkout` lane's files self-contained.
- `settle` is a no-op guard: passing `undefined` (the success path) always triggers a fresh mint.
