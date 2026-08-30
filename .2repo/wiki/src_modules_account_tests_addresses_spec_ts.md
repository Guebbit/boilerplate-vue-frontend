# src/modules/account/tests/addresses.spec.ts

## Purpose

Unit tests for the `useAddressesStore` that exercise all four address-book endpoints (fetch, add, update, delete) with only the HTTP transport mocked. The store's own fetch-after-write logic runs unmocked so the tests verify that the local list is always *replaced* by the server's full-book response rather than patched row-by-row.

## Key elements

- **`lastRequest()`** — Helper that pulls the axios config (url, method, data) from the most recent `orvalMutator` call, or throws if none occurred.
- **`respondWithBook(addresses)`** — Configures the mocked `orvalMutator` to resolve with `{ data: { addresses } }`, simulating a server that always returns the whole book.
- **`describe('useAddressesStore')`** — Six tests covering: initial empty state; GET fetch; POST add; PUT update by id; DELETE with server-side default promotion; and the `?? []` fallback when the payload lacks an `addresses` key.
- **Fixtures `HOME` / `WORK`** — Two static address objects (one default, one not) used across tests to represent a two-entry book.

## Relationships

- **`@/infrastructure/http`** (graph neighbor) — The single module under test. `orvalMutator` is imported and then fully replaced via `vi.mock`, so no real HTTP call is ever made. The store under test (`useAddressesStore`) calls `orvalMutator` internally; these tests assert on the shape of the request it receives and the response it is fed back.

## Notes

- The central invariant being pinned: **exactly one default address**, which is a property of the *list*, not of any single row. Every write test therefore asserts the full array is swapped, not that one element changed.
- The `removeAddress` test is the sharpest case: if the store deleted the row locally, the book would briefly show zero defaults. The test confirms the store instead awaits the server's answer (which promotes the oldest survivor to `default: true`) before updating state.
- The empty-payload test (`data: {}`) guards the `?? []` fallback inside `readAddressesResponse`; without it, consumers calling `.map()` on the result would crash at render time rather than showing an empty list.
- `beforeEach` creates a fresh Pinia instance and clears all mocks, so tests are fully isolated with no cross-test state.
