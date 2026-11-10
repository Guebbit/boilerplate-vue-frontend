---
source: src/modules/account/tests/addresses.spec.ts
sha256: 30bb9a2b901d84004b62acad28d0d5a3e1fef24c685fbf1d44dcf0ac77ff5082
signature: 7bf7bba637ee96e0a3277c24511cd125f30031059c601655d5690654c2b1db26
generated_at: 2026-11-10T03:29:49.966142+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/addresses.spec.ts

## Purpose

Unit tests for `useAccountAddressesStore` that mock **only** the HTTP transport (`orvalMutator`) so the store's real fetch-after-write logic executes. Every write case asserts the same invariant: the store replaces its local list with a fresh `GET` reload rather than patching a single row in place.

## Key elements

- **`respondWithBook(addresses, written?)`** — Configures `orvalMutator` to answer `GET` with the full book, `DELETE` with `undefined` (204), and any write method with the single `written` entry. All responses are validated against the API schema via `parseOrvalFixture`.
- **`lastRequest()`** — Returns the axios config (`url`, `method`, `data`) of the most recent `orvalMutator` call; throws if none was made.
- **`requestLog()`** — Returns an ordered array of `"METHOD /path"` strings for every transport call, used to assert the exact request sequence (e.g. `POST → GET`).
- **`wireModulesIntoCore()`** — Injects DI so the Pinia store can resolve its dependencies in the test runtime.
- **`describe('useAccountAddressesStore')`** — Six cases covering: initial empty state, `fetchAddresses`, `addAddress`, `updateAddress`, `setDefaultAddress`, and `removeAddress`. Each write case verifies both the request log and the final store state.

## Relationships

- **`src/modules/account/stores/addresses.ts`** — The store under test; every test instantiates it via `useAccountAddressesStore()`.
- **`src/infrastructure/http/index.ts`** — Import source for `orvalMutator`. This test file replaces that export with a mock implementation so no real HTTP occurs; all assertions on request sequences read from the mock's call log.
- **`tests/support/unit/orval-fixture-schema.ts`** — Provides `parseOrvalFixture`, used by both the default mock factory and `respondWithBook` to validate that mock payloads conform to the expected response schema for the given `method`/`url`.
- **`tests/support/unit/wire-modules.ts`** — Provides `wireModulesIntoCore`, called once at module scope to register the store's DI dependencies before any test runs.

## Notes

- The store's write methods (`addAddress`, `updateAddress`, `setDefaultAddress`, `removeAddress`) are tested **as black boxes**: the tests do not stub internal store methods, only the transport. This is intentional—the fetch-after-write sequence is the behavior under test.
- `removeAddress` is called out in the file header as the most critical case: deleting the default address triggers server-side promotion of another entry, so a store that merely splices the row locally would show no default until the reload completes.
- The `written` parameter in `respondWithBook` simulates the contract that create/patch/put respond with exactly the one affected entry (not the full book), which is why the store must reload rather than trust the response body.
- `vi.clearAllMocks()` in `beforeEach` resets call history, so `requestLog()` assertions always reflect only the current test's traffic.
