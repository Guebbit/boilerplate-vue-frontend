---
source: src/modules/payments/tests/use-record-offline-payment.spec.ts
sha256: 42484c59438bbb68c7ff385ba374fc2df6bed2b4a865349770e97f04629822ab
signature: ced1094a15dadd2e80ca2e0a0e1eecbc12a0acc9fb10ce71c67d699bb9f6f5a2
generated_at: 2026-11-10T05:18:19.228174+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/use-record-offline-payment.spec.ts

## Purpose

Unit test for the `useRecordOfflinePayment` composable. It pins two behavioural contracts: (1) the composable is a thin pass-through that calls the API and mirrors the result into the payments store, and (2) any server-side refusal (e.g. 409 "payment in flight") propagates as a rejection so the *caller* can render a toast. A third case guards that no HTTP call is made when the order id is absent.

## Key elements

- **`wireModulesIntoCore()`** — called at module scope to inject test doubles into the DI container before any test runs.
- **`PAYMENT`** — canned success body (cash, `succeeded`, `manual` provider) returned for `POST /orders/o1/payments`.
- **`responses`** — mutable `Record<string, unknown>` keyed by `` `${METHOD} ${url}` ``; the single source of truth for what the mocked API answers.
- **`rejectWith(status, message, code)`** — builds the Problem+ rejection envelope that `onResponseReject` inside the composable produces.
- **`Declined` / `isDeclined`** — a type-guard pair that distinguishes a stubbed *refusal* entry (has both `status` and `code`) from a success body.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a router that looks up `responses[key]`; unknown keys reject with 404, `Declined` entries reject with their status, everything else resolves through `parseOrvalFixture`.
- **`describe('useRecordOfflinePayment')`** — three `it` blocks: success mirroring, 409 pass-through, and the no-order-id short-circuit.

## Relationships

- **`src/modules/payments/composables/use-record-offline-payment.ts`** — the system under test; imported as `useRecordOfflinePayment`.
- **`tests/support/unit/wire-modules.ts`** — provides `wireModulesIntoCore`, which registers module-level test doubles in the DI container.
- **`tests/support/unit/orval-fixture-schema.ts`** — provides `parseOrvalFixture`, used to validate and reshape canned success responses against the OpenAPI-generated schema.
- **`tests/support/unit/fixtures.ts`** — provides `aProblem`, the factory that builds the Problem+ error envelope used by the mock's rejection path.

## Notes

- The `eslint-disable` on `rejectWith` is intentional: the API's rejection contract is a Problem+ *envelope*, not a JS `Error`. Tests assert against that shape directly.
- The composable is deliberately "dumb" — it never inspects order status or in-flight charges. Those are the server's 409s. The tests pin that the composable does *not* add client-side gating.
- The no-order-id test passes `ref(undefined)` and asserts the result is `undefined` (not a rejected promise), confirming the composable short-circuits before constructing a URL.
