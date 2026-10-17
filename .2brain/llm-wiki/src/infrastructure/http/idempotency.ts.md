---
source: src/infrastructure/http/idempotency.ts
sha256: dd74aba963f83b0ba8dcca87f950a1fadec9fdbdf4878751dde4e72ad71ac801
generated_at: 2026-10-17T00:09:27.363425+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/idempotency.ts

## Purpose

Provides a Vue composable (`useIdempotencyKey`) that mints and tracks a single `Idempotency-Key` header value per user intent (e.g. one payment step, one form submission). The key survives retryable failures (transport errors, 5xx) so the server can deduplicate retries, and is replaced with a fresh UUID after any definitive response (success or 4xx), signaling that the next attempt is a genuinely new intent.

## Key elements

- **`IDEMPOTENCY_KEY_HEADER`** — Exported constant (`'Idempotency-Key'`); the header name the paired backend's idempotency middleware reads.
- **`IdempotencyKeyKeeper`** (interface) — The contract a keeper exposes:
  - `withKey(options?)` — Merges the current key into an `AxiosRequestConfig`, preserving any pre-set headers (e.g. an antibot token).
  - `settle(error?)` — Called after the guarded request resolves or rejects; keeps the key if the error is retryable, otherwise mints a new one.
- **`useIdempotencyKey()`** (composable) — Creates a keeper backed by a Vue `ref<UUID>`. Mints a key immediately so the first attempt already carries one. Returns the two methods above. Uses `crypto.randomUUID()` for key generation.
- **`isRetryableFailure`** (imported from `@/infrastructure/utils/errors.ts`) — Used inside `settle` to decide whether an error warrants keeping the key.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — Listed as a graph neighbor; no direct import or reference is visible in this file's source. The interaction is likely indirect (e.g. a shared parent module or a convention-level coupling).
- **`src/infrastructure/utils/errors.ts`** — Imported for `isRetryableFailure`, which determines whether `settle` preserves or replaces the key.
- **`src/infrastructure/http/antibot.ts`** (referenced in docs, not imported) — `withAntibotToken` sets headers in the same shape; callers are expected to merge their antibot config into the same `AxiosRequestConfig` that `withKey` produces.
- **Cart store's `checkoutIdempotencyKey`** (referenced in docs) — A separate, independent copy of the same concept; this module is not a dependency of it.

## Notes

- One keeper per distinct user intent. A component or store holds it for as long as retrying the *same* intent should reuse the *same* key. Creating a second keeper (e.g. in a separate reactive effect) gives an independent key.
- `withKey` returns a shallow copy of the passed config; it does not mutate the caller's object. The nested `headers` object is also a fresh spread, so the caller's original `headers` is untouched.
- The `settle` contract: pass `undefined` (or omit the argument) on success to force a fresh key; pass the rejected value on failure so `isRetryableFailure` can inspect it.
- An eslint-disable comment documents that spreading an `AxiosHeaders` instance is intentional and mirrors what `orvalMutator` does elsewhere.
