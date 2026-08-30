# src/modules/delivery/tests/store.spec.ts

## Purpose

Vitest spec for the delivery Pinia store. It transport-mocks the HTTP layer (same pattern as the wishlist spec) to verify the store's API surface, the `effectivePrice` free-above display rule, and the critical 404-vs-other-error distinction on shipment reads.

## Key elements

- **`METHODS`** – Fixture array with two delivery methods: `standard` (price 5, `freeAbove: 100`) and `express` (price 15, no threshold).
- **`responses`** – Module-level `Record<string, unknown>` keyed `"METHOD /url"`, reset in `beforeEach`. Tests mutate it to simulate different HTTP outcomes.
- **`rejectWith(status, message)`** – Builds the API's reject envelope (`{ success: false, status, message, errors }`). The store identifies "nothing shipped yet" by reading `status` off this shape.
- **`vi.mock('@/infrastructure/http')`** – Replaces `orvalMutator` with a lookup against `responses`; unmatched keys resolve to a 404 reject.
- **`beforeEach`** – Activates a fresh Pinia, clears mocks, and seeds default 200 responses for `/delivery/methods`, `/delivery/order/order-1`, and `/delivery/advance`.
- **`describe('fetchMethods')`** – Asserts the store mirrors the API method list by id.
- **`describe('effectivePrice')`** – Verifies the threshold is inclusive (`100 → 0`, `99.99 → 5`) and that a method without `freeAbove` is never free.
- **`describe('fetchShipmentForOrder')`** – Two tests: a 404 resolves to `undefined` (nothing shipped), while a 500 rejects with the envelope and does **not** swallow into "nothing shipped".
- **`describe('advance')`** – Confirms the return value passes through the API's count.

## Relationships

The dependency graph reports no neighbors for this file. (It imports `useDeliveryStore` from `@/modules/delivery/store.ts` and mocks `@/infrastructure/http`, but neither appears in the graph.)

## Notes

- **404 is the only "soft" failure.** Any other status (500, network error) must reject; the test explicitly guards against the store collapsing them into `undefined`. This is called out as "the one wrong answer this panel can give."
- **Reject shape is not a native `Error`.** `rejectWith` produces a plain object matching the API envelope; an eslint-disable comment documents this as the client's rejection contract.
- **`freeAbove` is inclusive.** At exactly `freeAbove` the price drops to 0; just below it the full price applies.
- **Mid-test mutation of `responses`.** The shipment test clears `responses` between two `.then()` calls in the same chain to simulate a 404 on the second read—there is no separate mock call to reconfigure.
- **Mock keying.** The `orvalMutator` stub looks up responses by upper-cased method + space + URL. Adding a new endpoint to the store requires a matching key in `beforeEach`.
