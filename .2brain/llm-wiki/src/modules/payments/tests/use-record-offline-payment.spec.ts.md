---
source: src/modules/payments/tests/use-record-offline-payment.spec.ts
sha256: f8ae1f1335659acfb767b18aad3c7a29f3cbd3253cfb9d5b3101d589bb80f4cd
generated_at: 2026-10-17T01:26:36.130776+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/use-record-offline-payment.spec.ts

## Purpose

Unit tests for the `useRecordOfflinePayment` composable. They pin down a deliberate design contract: the composable performs the API call and mirrors the response, but makes **no** client-side decision about whether recording is allowed. Business-rule rejections (e.g. a card charge already in flight) are the server's 409, surfaced to the caller as a toast.

## Key elements

- **`PAYMENT`** – Canned cash-payment object (order `o1`, €50, `manual`/`cash`) used as the success fixture.
- **`responses`** – Mutable `Record<string, unknown>` keyed by `"METHOD /url"`; reassigned in `beforeEach` and per-test to drive the mocked transport.
- **`rejectWith(status, message, code)`** – Returns a rejected Promise whose value is the API's error *envelope* (`{ success: false, status, message, errors }`), matching the composable's only catch shape.
- **`Declined` / `isDeclined`** – Interface + type-guard distinguishing a stubbed refusal entry from a success fixture in `responses`.
- **`vi.mock('@/infrastructure/http')`** – Replaces `orvalMutator` with a stub that looks up `responses[key]`, rejects with `rejectWith` on a `Declined` entry or missing key, and resolves via `parseOrvalFixture` otherwise.
- **`beforeEach`** – Resets Pinia (`createPinia`), clears all mocks, and seeds `responses` with the default `POST /payments/order/o1/offline` success envelope.
- **`describe('useRecordOfflinePayment')`** – Three tests:
  1. *records the payment and mirrors it into the payments store* – happy path.
  2. *lets a refusal through — the caller owns the toast* – asserts the 409 envelope propagates unchanged.
  3. *does nothing without an order id rather than calling a broken url* – asserts `undefined` return when the order-id ref is `undefined`.

## Relationships

- **`src/modules/payments/composables/use-record-offline-payment.ts`** – The system under test; imported directly and exercised via `useRecordOfflinePayment(ref(…))`.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called once at module scope to register Pinia modules so the composable's internal store access resolves.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – Provides `orvalEnvelope` (wraps a domain object into the API success envelope) and `parseOrvalFixture` (validates/normalises the fixture against the expected method+url shape).

## Notes

- The `rejectWith` helper carries an `eslint-disable` for `prefer-promise-reject-errors`: the API's error *envelope* is the client's rejection contract, so rejecting with a plain object is intentional, not an oversight.
- The mock routes purely on the `${method} ${url}` string; any test that changes the URL pattern must update the key in `responses` accordingly.
- `wireModulesIntoCore()` runs once outside `beforeEach`; Pinia is recreated per test, but the module wiring persists for the file's lifetime.
