---
source: src/modules/payments/tests/store.spec.ts
sha256: 2d011684335a1980ffb3ba6b68f716c532d384508aae40b126b6bfc498bed5aa
generated_at: 2026-10-17T01:25:59.328802+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/store.spec.ts

## Purpose
Vitest unit tests for the payments Pinia store. The HTTP transport (`orvalMutator`) is mocked as a method/URL-keyed router so the generated client and the store itself remain real. The tests pin the PSP sequence (intent → confirm with provider method ref → sync for challenge resolution) and the critical distinction that a 404 on read resolves to `undefined` ("no payment yet") while every other failure still rejects to the caller.

## Key elements
- **`responses`** — mutable record mapping `METHOD /url` strings to canned replies; set in `beforeEach` and overridden per-test.
- **`vi.mock('@/infrastructure/http', …)`** — replaces `orvalMutator` with a router that dispatches on the request key; returns a resolved envelope, a `rejectWith` rejection, or a `Declined`-shaped 4xx.
- **`rejectWith(status, message, code)`** — builds the exact rejection envelope (`{ success: false, status, message, errors: [{ code, message }] }`) that `onResponseReject` would produce.
- **`isDeclined`** — type guard distinguishing a canned API-level refusal (`{ status, code, message }`) from a generic `Error` (transport failure).
- **`requestedUrls()` / `idempotencyKeyOf(suffix)`** — assertion helpers that inspect `orvalMutator` mock calls in order.
- **`describe` blocks** — `fetchMethods`, `fetchPaymentForOrder`, `payForOrder`, `finishAtProvider`, `recordOfflinePayment`; each covers the happy path, the 404-as-absence case (where applicable), and the "other failures propagate" case.

## Relationships
- **`src/modules/payments/store.ts`** — the system under test; `usePaymentsStore` is instantiated against a fresh Pinia per test.
- **`src/infrastructure/http/index.ts`** — source of `orvalMutator`; fully replaced by the `vi.mock` factory so no real network code runs.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope to register the store and its dependencies in the DI/module system before any test executes.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — supplies `orvalEnvelope` (wraps a fixture in the API envelope), `parseOrvalFixture` (used inside the mock to shape the resolved value), and `contractRequest` (validates a request body against an OpenAPI schema before comparison).

## Notes
- The reject envelope is a **plain object**, not an `Error`. The eslint-disable comment marks this as intentional: it mirrors the client's actual rejection contract.
- Idempotency-key assertions are a security guard: the intent request must carry **no** `Idempotency-Key` header (a stored replay could leak the key), while confirm must.
- `contractRequest` is used to assert that confirm/offline request bodies contain only a provider method reference (`pm_card_visa`), never raw card digits — a regression to inline card data would fail the schema check.
- The `Declined` interface and `isDeclined` guard exist so tests can stub the exact `errors[].code` shape a real 4xx sends (e.g. `PAYMENT_DECLINED`, `PAYMENT_IN_FLIGHT`) rather than collapsing everything into a generic 500.
- A 3-D Secure / bank-transfer challenge (`requires_action`) is asserted to **resolve**, not reject; treating it as a failure would strand every challenge-based payment.
