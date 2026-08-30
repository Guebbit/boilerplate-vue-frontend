# src/modules/payments/tests/store.spec.ts

## Purpose

Unit test for the payments Pinia store with the HTTP transport (`orvalMutator`) replaced by a string-keyed router. It pins two invariants: the PSP call sequence (intent → confirm with card) and the asymmetry between a 404 ("no payment yet", resolves to `undefined`) and any other failure (must reject and reach the caller).

## Key elements

- **`rejectWith(status, message)`** — Builds the rejection envelope (`{ success: false, status, message, errors: [message] }`) that `onResponseReject` in the real client produces. The store reads `status` off this shape to distinguish "not found" from a real error.
- **`vi.mock('@/infrastructure/http', …)`** — Replaces `orvalMutator` with a router: `METHOD /url` → `responses[key]`. Unknown keys return a 404 envelope; `Error` instances become 500 envelopes; everything else resolves.
- **`requestedUrls()`** — Extracts the `.url` from each recorded `orvalMutator` call, used to assert call ordering.
- **`describe('fetchPaymentForOrder')`** — Three cases: mirrors API data into `store.payment`; 404 → `undefined` (no crash); 500 → rejects with `{ status: 500 }`.
- **`describe('payForOrder')`** — Two cases: verifies the exact URL sequence `['/payments/intent', '/payments/payment-1/confirm']`; decline on confirm propagates a rejection (caller owns the UX).
- **`beforeEach`** — Fresh Pinia, cleared mocks, and a default `responses` map covering intent, confirm, and read-by-order.

## Relationships

- **`src/infrastructure/http/index.ts`** — The module under mock. The test replaces its `orvalMutator` export (the transport the generated Orval client and the store both call) with a deterministic router, isolating store logic from the network.

## Notes

- The mock router keys on `` `${method.toUpperCase()} ${url}` ``; adding a test for a new endpoint means adding a matching string to `responses`.
- Rejections are plain objects (the envelope), **not** `Error` instances — hence the `eslint-disable` comment. The store identifies a 404 by reading `.status` off this shape; nothing else in the test would distinguish "no payment" from "server broke."
- `requestedUrls()` only records `.url`, not query params or method, so it verifies *which* endpoints were hit in what order but not how they were called.
- The test imports the store directly from `@/modules/payments/store.ts` (note the `.ts` extension); it does not test the generated Orval client itself — that is assumed real and correct.
