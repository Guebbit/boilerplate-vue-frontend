---
source: src/modules/payments/tests/use-record-offline-payment.spec.ts
sha256: d73954b4660eb8c841ff105aa1d6a2a909a2562df4b3b39eb34d0ff557e5f85e
generated_at: 2026-10-02T15:32:28.882029+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/use-record-offline-payment.spec.ts

## Purpose

Vitest spec for the `useRecordOfflinePayment` composable. It pins the contract that the composable is a thin "perform the call and mirror the answer" layer: it performs the `POST /payments/order/:id/offline` request, mirrors a success into the payments store, and passes a rejection envelope through untouched. Business-rule decisions (e.g. "a card charge is in flight") are the server's 409, not the composable's.

## Key elements

- **`useRecordOfflinePayment(orderId: Ref<string | undefined>)`** — the composable under test (imported from `@/modules/payments/composables/`). Returns `{ recordOfflinePayment }`.
- **`PAYMENT`** — static fixture object (id, orderId, userId, amount 50 EUR, status `succeeded`, provider `manual`, method `cash`).
- **`rejectWith(status, message, code?)`** — builds the client's rejection envelope shape (`{ success: false, status, message, errors: [{ code, message }] }`) used to simulate API-level refusals.
- **`isDeclined`** — type guard distinguishing a stubbed 4xx/5xx refusal object from a success fixture.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a router keyed on `METHOD url`; undefined keys 404, `Declined` objects reject, everything else resolves via `parseOrvalFixture`.
- **Three `it` blocks** — success (store mirror), 409 pass-through (caller owns the toast), missing order-id no-op (returns `undefined`, no network call).

## Relationships

- **`tests/support/unit/wire-modules.ts`** → `wireModulesIntoCore()` is called once at module top-level to register the payments module's Pinia stores and DI wiring before any test runs.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** → provides `orvalEnvelope` (wraps `PAYMENT` into the expected API envelope) and `parseOrvalFixture` (deserialises the envelope back into the typed shape the composable consumes).

## Notes

- The composable is **not** re-exported through the module barrel; only `RecordOfflinePaymentForm` calls it. This spec is the sole behavioural contract.
- `orvalMutator` is mocked at the `@/infrastructure/http` boundary, so no real HTTP layer or Orval-generated client code runs.
- `vi.clearAllMocks()` in `beforeEach` resets the `orvalMutator` mock call counts; the `responses` map is re-seeded each time.
- The rejection envelope shape (`success: false`, `errors[]`) is the **client's** rejection contract — it is not a raw `Error` or HTTP `Response`.
