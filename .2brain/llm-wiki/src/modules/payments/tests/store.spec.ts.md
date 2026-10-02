---
source: src/modules/payments/tests/store.spec.ts
sha256: 6decc5c31a7dabde2824e3b232766f82f0b72ff68ce7bdcabf4f748d8b6217ea
generated_at: 2026-10-02T15:31:42.280321+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/store.spec.ts

## Purpose

Unit tests for the payments Pinia store (`usePaymentsStore`). The transport (`orvalMutator`) is mocked as a key-based router while the generated API client and the store under test remain real. The suite pins the PSP call sequence (intent → confirm → sync), the semantic split between "404 = no payment yet" and "any other failure = reject to caller", and the exact request-body shapes the store sends to each endpoint.

## Key elements

- **`PAYMENT`** — shared fixture object (id, orderId, amount, status, etc.) reused across tests.
- **`responses: Record<string, unknown>`** — mutable per-test routing table keyed by `"METHOD /url"`; the mock consults it to decide what to return.
- **`rejectWith(status, message, code?)`** — builds the rejection envelope that `onResponseReject` would produce (plain object with `success: false`, `status`, `errors[]`), not a native `Error`.
- **`Declined` / `isDeclined`** — type guard distinguishing an API-level refusal (`{ status, code, message }`) from a transport `Error` inside the mock router.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a function that looks up `responses[key]`, returns 404 on miss, wraps `Error` instances as 500, maps `Declined` to the envelope, and parses valid fixtures via `parseOrvalFixture`.
- **`requestedUrls()`** — extracts the `url` field from every recorded `orvalMutator` call; used to assert call order.
- **`describe` blocks** — one per store method: `fetchMethods`, `fetchPaymentForOrder`, `payForOrder`, `finishAtProvider`, `recordOfflinePayment`, `findOrderByReference`.
- **`contractRequest(schema, body)`** — validates a recorded request body against the generated OpenAPI schema (e.g. `ConfirmPaymentBody`, `RecordOfflinePaymentBody`) to catch payload-shape regressions.

## Relationships

- **`src/infrastructure/http/index.ts`** — provides `orvalMutator`, the HTTP transport the store calls. This file mocks that entire module so the store runs against deterministic routing instead of a network.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is invoked at module top-level to register the DI bindings the store depends on before any test executes.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — supplies `orvalEnvelope` (wrap a domain object in the API response envelope), `parseOrvalFixture` (validate a fixture against the generated schema before resolving), and `contractRequest` (validate a request body). All three are imported and used throughout.

## Notes

- The mock router distinguishes **four** shapes: `undefined` → 404, `Error` instance → 500 transport failure, `Declined` object → API refusal with a specific `errors[].code`, and a valid fixture → success. Conflating these would hide bugs in the store's error-handling logic.
- The `eslint-disable` on `rejectWith` is deliberate: the rejection contract is a plain object (the API's error envelope), not a `Error` subclass. The store reads `.status` off the rejection to separate "absence" from "failure"; a native `Error` would not carry that field.
- A `requires_action` response (3-D Secure / bank challenge) must **resolve**, not reject. A regression that rejects here would strand every challenge-based payment.
- The confirm step sends only a `paymentMethodRef` (e.g. `'pm_card_visa'`); raw card digits must never appear in the request body. The `contractRequest` assertion enforces this.
- `recordOfflinePayment` can be rejected with `PAYMENT_IN_FLIGHT` — a distinct code from `PAYMENT_DECLINED` — because an already-in-flight card charge would cause a double-charge if the offline record were also accepted.
