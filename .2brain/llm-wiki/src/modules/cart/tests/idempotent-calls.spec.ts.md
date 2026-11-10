---
source: src/modules/cart/tests/idempotent-calls.spec.ts
sha256: dd1b4db5fa106ce526d44587b2db6dfb53de0a6ccf9de233478896a00c65ee1d
signature: ce80f33dafbb5fb28f301bb4887eb48bc7693fc77a803788c2a8ab8179ce4fe4
generated_at: 2026-11-10T04:07:29.485298+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/idempotent-calls.spec.ts

## Purpose

Unit tests for the keyed-call transport rules defined in `idempotent-calls.ts`: verifying that an in-flight 409 is retried under the same idempotency key once per configured delay, that any other refusal is rethrown immediately, and that `isMergeRefusedForGood` classifies only 400/413/422 as final merge refusals.

## Key elements

- **`sendCheckout`** (under test) — the exported retry wrapper; tests confirm it reuses the same idempotency key on every attempt and stops after the supplied delay list is exhausted.
- **`isMergeRefusedForGood`** (under test) — predicate that returns `true` for 400/413/422 rejections, `false` for 409/500/503, and `false` for a `lostAnswer`.
- **`IDEMPOTENCY_KEY_HEADER`** — imported constant; used in assertions to verify the header is set to the same key on every call.
- **`BODY`** — a zero-value `CheckoutRequest` (`{} as CheckoutRequest`); a placeholder because the tests only assert on key and call count, never on request body.
- **`vi.mock('@api', …)`** — module-level mock of the `checkout` API so the transport under test can be driven with scripted rejections/resolutions.
- **`afterEach` → `vi.resetAllMocks()`** — clears mock state between tests.

## Relationships

- **`src/modules/cart/idempotent-calls.ts`** — the SUT. The spec imports `sendCheckout`, `isMergeRefusedForGood`, and `IDEMPOTENCY_KEY_HEADER` from this file.
- **`tests/support/unit/async-answers.ts`** — supplies `apiRejection(status, code)`, `answered(order)`, and `lostAnswer()` helpers used to script mock outcomes.
- **`tests/support/unit/fixtures.ts`** — supplies `anOrder()`, the order shape passed to `answered()` to produce a successful resolution.

## Notes

- Retry delay arrays are passed as `[0, 0]` / `[0]` so tests complete without real waits; the production code presumably inserts a `setTimeout` between retries.
- The spec never inspects the request body—only the idempotency-key header and the number of `apiCheckout` calls. If future tests need body-level assertions, the `BODY` constant must be replaced with a real fixture.
- `isMergeRefusedForGood` treats a `lostAnswer` (network failure) as *not* a final refusal, meaning the caller may still retry or fall back; this is an intentional distinction from a definitive 4xx.
