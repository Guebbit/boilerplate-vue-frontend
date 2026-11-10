---
source: src/modules/payments/tests/store.spec.ts
sha256: 4a862eb56b87178f3cd644cad533dfb2a9c73866e04fc121cd9aa7e8b90e0760
signature: e6789a6913f87b54658f750d12dc460994968cdf971d2d3c50c5f2a36d98d322
generated_at: 2026-11-10T05:17:17.723359+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/store.spec.ts

## Purpose

Unit tests for the payments Pinia store. The transport layer (`orvalMutator`) is mocked as a `METHOD /url`-keyed router while the store and generated client remain real. The suite pins the PSP sequence (intent → confirm → sync), the contract that only a 404/empty response means "no payment yet" (any other failure must propagate), and header/contract details such as idempotency keys and the confirm body shape.

## Key elements

- **`PAYMENT`** – Canned payment fixture (`status: 'requires_confirmation'`, provider `fake`) used as the default API response.
- **`responses`** – Mutable `Record<string, unknown>` mapping `"METHOD /url"` keys to canned bodies, `Error` (transport failure), or `Declined` objects. Reset in `beforeEach` to a full happy-path set.
- **`rejectWith(status, message, code?)`** – Builds the standard error-envelope rejection (`aProblem(...)`) that the store must distinguish from a successful `undefined` return.
- **`Declined` / `isDeclined`** – Test-only shape (`{ status, code, message }`) representing an API-level 4xx refusal, distinct from `Error` which simulates a transport failure.
- **`vi.mock('@/infrastructure/http')`** – The transport mock. Routes by `METHOD /url`; returns 404 for unregistered keys, 500 for `Error` entries, the `Declined`'s status for `Declined` entries, and `parseOrvalFixture`-validated data otherwise.
- **`requestedUrls()` / `idempotencyKeyOf(suffix)`** – Inspection helpers that read `orvalMutator` mock calls to assert call order and header presence.
- **`beforeEach`** – Resets Pinia, clears mocks, and installs the default response table (create, confirm, sync, read-by-order, read-by-id).
- **`describe('fetchMethods')`** – Verifies the store mirrors the API's method list.
- **`describe('fetchPaymentForOrder')`** – Covers happy read, empty-list → `undefined`, and 500 → rejection (not `undefined`).
- **`describe('payForOrder')`** – PSP sequence order, no idempotency key on intent, confirm body matches `ConfirmPaymentBody` schema, decline propagates with `PAYMENT_DECLINED` code, challenge (`requires_action`) resolves without rejection.
- **`describe('finishAtProvider')`** – Sync call, re-read on `PAYMENT_DECLINED` only, no re-read on unrelated refusals (429, etc.).
- **`describe('recordOfflinePayment')`** – Manual/offline payment recording (method, reference, settled status).

## Relationships

- **`src/modules/payments/store.ts`** – Module under test; `usePaymentsStore` is the sole SUT.
- **`src/infrastructure/http/index.ts`** – Its exported `orvalMutator` is the function the test replaces; the replacement routes canned responses by `"METHOD /url"` key in place of the real HTTP client.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module scope to inject test doubles into the DI container before any test runs.
- **`tests/support/unit/fixtures.ts`** – Supplies `aProblem` (error-envelope factory) and `aPayment` (payment fixture builder).
- **`tests/support/unit/orval-fixture-schema.ts`** – Supplies `parseOrvalFixture` (schema-validates canned responses) and `contractRequest` (asserts a request body conforms to an API schema; used here with `schemas.ConfirmPaymentBody`).

## Notes

- The mock keys on the **string** `"METHOD /url"` (e.g. `"POST /payments"`); tests must match this exact format when overriding `responses`.
- `rejectWith` deliberately rejects with a **non-`Error` object** (the API's error envelope). The `eslint-disable` comment marks this as an intentional client rejection contract, not a lint oversight.
- The store distinguishes "no payment" (404 → `undefined`) from a real failure by reading `status` off the rejection envelope. No other shape carries that signal, so tests must use the `aProblem`/`Declined` paths rather than plain `Error` when asserting 4xx behavior.
- `wireModulesIntoCore()` runs at **module import time**, not inside any test. Removing it silently breaks all store actions that depend on injected services.
- The `Declined` interface is test-local; it is **not** exported from the store or the HTTP layer. Production code never sees this type.
