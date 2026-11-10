---
source: src/modules/cart/idempotent-calls.ts
sha256: 0762b690e5b13497c826eb4addcfa569a969d14a748b89cd2c4389aedc37d738
signature: d6949f21e62aaafc893f86aeecf8745d1bc386c091583e306fde4eb14fa9e9f9
generated_at: 2026-11-10T03:58:56.759045+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/idempotent-calls.ts

## Purpose

Transport-layer rules for the cart's two idempotent calls: exports the `Idempotency-Key` header constant, the retry ladder used when checkout answers `IDEMPOTENCY_IN_FLIGHT`, and the predicate that decides whether a merge refusal is final. Entirely stateless — `store.ts` owns what the results do to cart state.

## Key elements

- **`IDEMPOTENCY_KEY_HEADER`** — String constant (`'Idempotency-Key'`) matching the header the paired backend's idempotency middleware reads on `POST /cart/checkout`.
- **`IN_FLIGHT_RETRY_DELAYS_MS`** — `readonly number[]` (`[1000, 2000, 4000]`): wait-before-retry intervals when the server says the first attempt is still running.
- **`isMergeRefusedForGood(error)`** — Returns `true` for answered HTTP 400 / 413 / 422 (not a transport failure). Signals the stored guest list is invalid and should not be retained for the next sign-in.
- **`sendCheckout(checkoutData, key, delays?)`** — Calls the Orval `apiCheckout` with the key as a header. On an `in-flight` classification, waits the next delay and re-sends the **same key** (replay, not a new order). Exhausts after three retries or any non-in-flight error.
- **`MERGE_REFUSED_FOR_GOOD`** (module-private `Set`) — The status codes checked by `isMergeRefusedForGood`.
- **`wait(ms)`** (module-private) — `setTimeout` → `Promise<void>` helper.

## Relationships

- **`src/modules/cart/domain/checkout-errors.ts`** (via `src/modules/cart/domain/index.ts`) — Imports `classifyCheckoutError`, used inside `sendCheckout` to distinguish an in-flight 409 from other errors.
- **`src/infrastructure/utils/errors`** — Imports `isTransportFailure`, used by `isMergeRefusedForGood` to exclude network-level rejections.
- **`src/modules/cart/store.ts`** — Primary consumer; the store decides what `sendCheckout` results and `isMergeRefusedForGood` outcomes mean for cart state.
- **`src/modules/cart/tests/idempotent-calls.spec.ts`** — Unit tests for the retry ladder, header, and refusal predicate.
- **`src/modules/cart/tests/cart-view-stale-refusal.spec.ts`** — Tests the stale-refusal path that depends on `isMergeRefusedForGood`.
- **`src/modules/cart/tests/store-checkout-key.spec.ts`** — Verifies the store passes the correct key through to `sendCheckout`.

## Notes

- The retry always re-sends the **same** idempotency key; a 409 here means "not yet," never "no." Do not treat it as a final rejection.
- `sendCheckout`'s third `delays` parameter is injectable (defaults to `IN_FLIGHT_RETRY_DELAYS_MS`) so tests can shorten or remove waits without touching timers.
- The Orval-generated `apiCheckout` accepts the key as a second-argument config object (`{ headers: { ... } }`), not as a top-level parameter.
