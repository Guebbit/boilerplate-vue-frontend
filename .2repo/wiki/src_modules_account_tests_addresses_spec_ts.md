# src/modules/account/tests/addresses.spec.ts

## Purpose

Unit tests for the `useAddressesStore` Pinia store. The only external dependency mocked is the HTTP transport (`orvalMutator`), so the store's real fetch-after-write logic (replace-the-whole-book, not patch-a-row) executes under test. The suite pins the invariant that the server is the source of truth for default-address promotion and list contents after every mutation.

## Key elements

- **`lastRequest()`** – inspects the most recent `orvalMutator` mock call and returns its axios config (`url`, `method`, `data`) for assertion.
- **`respondWithBook(addresses)`** – sets the mock transport to resolve with `{ data: { addresses } }`, i.e. a full-book response for any subsequent endpoint call.
- **`HOME` / `WORK`** – two fixed fixture addresses (one default, one not) used across all test cases.
- **Test cases** (one per CRUD verb + two edge cases):
  - Initial state is an empty array.
  - `fetchAddresses` issues GET `/account/addresses` and stores the returned list.
  - `addAddress` issues POST and **replaces** the local list with the response.
  - `updateAddress` issues PUT to `/account/addresses/:id` and replaces the list.
  - `removeAddress` issues DELETE to `/account/addresses/:id` and adopts the server-promoted default from the response.
  - A payload with no `addresses` key (`{ data: {} }`) is normalised to `[]`, never `undefined`.

## Relationships

- **`@/infrastructure/http`** (`src/infrastructure/http/index.ts`) – the sole module under test's dependency. `orvalMutator` is imported and replaced via `vi.mock`; all HTTP assertions go through it. The test never touches the real axios instance or network.
- **`@/modules/account/stores/addresses.ts`** – the SUT. Every assertion reads `store.addresses` or the return value of a store action; the test exercises the store's own `?? []` normalisation in `readAddressesResponse`.

## Notes

- **Replace, don't patch.** Every endpoint is stubbed to return the *entire* book. A store that locally splices or patches a single row would pass a naive stub test but fail here, because the suite asserts `store.addresses` equals the full response array.
- **Default promotion is server-side.** The `removeAddress` test explicitly sets the post-delete book to `[{ ...WORK, default: true }]` and asserts the store shows it. A client that deletes the row and re-evaluates defaults locally would produce a different (incorrect) state.
- **Sparse-payload guard.** The final test mocks `{ data: {} }` (no `addresses` key) to verify the `?? []` fallback. Without it, downstream `.map()` calls would throw a render-time crash rather than showing an empty list.
- **Mock default is `{ data: {} }`.** Before a test calls `respondWithBook`, the transport resolves an empty object. This is intentional—it mirrors the sparse-payload edge case and ensures no test accidentally relies on a "sensible" default shape.
