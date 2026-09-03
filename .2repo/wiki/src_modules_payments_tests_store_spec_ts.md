# src/modules/payments/tests/store.spec.ts

## Purpose

Vitest spec for the payments Pinia store. It pins two invariants: the PSP call sequence (create intent → confirm with card) and the critical contract that a 404 on the read endpoint means *"no payment yet"* (resolves to `undefined`) while **any other** failure must reject and propagate to the caller.

## Key elements

- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a router keyed on `` `${METHOD} ${url}` ``. Unmapped keys → 404; `Error` instances → 500; `Declined` objects → their own `status`; anything else → resolved.
- **`rejectWith(status, message, code?)`** — builds the exact rejection envelope (`{ success: false, status, message, errors: [{ code, message }] }`) that `onResponseReject` produces. This is the *only* shape the store's catch block sees.
- **`Declined` / `isDeclined`** — type-guard for API-level refusals (e.g. 409 `PAYMENT_DECLINED`) so a test can stub the precise `errors[].code` a real 4xx would send, as opposed to an `Error` which simulates a transport failure.
- **`requestedUrls()`** — extracts the `url` field from every `orvalMutator` call, used to assert the intent→confirm ordering.
- **`beforeEach`** — fresh Pinia, cleared mocks, default success responses for the three payment endpoints.
- **`describe('fetchPaymentForOrder')`** — three cases: mirrors API data, 404 → `undefined` (no crash), non-404 failure → rejects with `{ status: 500 }`.
- **`describe('payForOrder')`** — two cases: PSP sequence (intent then confirm, final status `succeeded`), and a 409 decline (`PAYMENT_DECLINED`) propagates to the caller.

## Relationships

- **`src/infrastructure/http/index.ts`** — the sole dependency under test. `orvalMutator` is mocked out entirely; the store's real code and the generated OpenAPI client run unmodified. The mock contract (routing by method+url, the rejection envelope shape) mirrors what the real transport layer guarantees via `onResponseReject`.

## Notes

- The store distinguishes *"no payment"* from *"real failure"* **solely by reading `status` off the rejection envelope** — there is no other signal. The spec guards this by asserting `undefined` for 404 and a rejected promise with a specific `status` for everything else.
- `Error` vs `Declined` in the `responses` map is a deliberate two-tier stub: `Error` → transport-level 500; `Declined` → API-level 4xx with a domain `code`. Tests that need a specific `errors[].code` (like `PAYMENT_DECLINED`) must use the `Declined` shape.
- The `eslint-disable` on `rejectWith` is load-bearing: the API's error envelope *is* this client's rejection contract, not a standard `Error` object.
