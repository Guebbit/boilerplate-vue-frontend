---
source: src/infrastructure/http/idempotency.ts
sha256: b531d67d807e200c404dc3883d73a2369d1a07048e346591d952d1cbaf9c88a9
signature: 4515f4acf9ab6a6d88e08bdba091dc99652cc1e368b030133bcfd6bca06b0421
generated_at: 2026-11-10T03:03:48.127306+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/idempotency.ts

## Purpose

Provides a reusable `Idempotency-Key` lifecycle for guarded HTTP writes. It mints a UUID per user intent, retains the key only while the first attempt may still be in-flight or was lost (connection drop, `409 IDEMPOTENCY_IN_FLIGHT`), and mints a fresh key after **any** response—including 5xx—because the backend stores every answer and replays it for the same key, so resending a used key would replay the fault.

## Key elements

- **`IDEMPOTENCY_KEY_HEADER`** — constant (`'Idempotency-Key'`) naming the header the backend's `idempotency` middleware reads.
- **`IdempotencyKeyKeeper`** (interface) — one intent's key plus two operations: `withKey(options)` merges the current key into an axios config; `settle(error?)` decides whether to keep or re-mint the key.
- **`useIdempotencyKey()`** — composable that returns a single `IdempotencyKeyKeeper` (key minted immediately via `crypto.randomUUID()`). One per distinct user intent (signup, a payment step, a contact-form submit).
- **`IdempotencyKeysBySubject`** (interface) — exposes `forSubject(subject: string)` to get-or-create a keeper scoped to a subject (order, product, return).
- **`useIdempotencyKeys()`** — composable returning `IdempotencyKeysBySubject`; maintains a `Map<string, IdempotencyKeyKeeper>` so two calls about different subjects never share a key.
- **`sendKeyed<T>(keeper, call, options?)`** — runs `call(keeper.withKey(options))`, then calls `keeper.settle()` (or `settle(error)`) in the `.then` / rejection handler before re-throwing. The single "send, then settle" pairing point for optional-key writes.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — no direct import or interaction in this file; listed as a graph neighbor but not referenced by the code above.

## Notes

- **5xx gets a fresh key.** Unlike some client-side retry strategies, a server error does *not* preserve the key because the backend has already stored the error response; resending the same key would replay that error.
- **Settle logic is asymmetric.** `settle()` (no arg → success) always mints a new key. `settle(error)` mints a new key *unless* `keepsIdempotencyKey(error)` (imported from `@/infrastructure/utils/errors.ts`) is true (in-flight / lost-connection cases).
- **One keeper = one intent.** A component or store should hold a keeper for as long as retrying the *same* intent should reuse the *same* key. Cross-subject reuse (e.g., reusing order A's key for order B) is refused by the API as a key collision.
- **Header merge via object spread** is explicitly noted as safe for `AxiosHeaders` enumerable entries; the same pattern is used by `withAntibotToken` in `infrastructure/http/antibot.ts`.
- The cart store maintains its own separate `checkoutIdempotencyKey` copy rather than building on this helper.
