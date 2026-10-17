---
source: src/modules/account/tests/addresses.spec.ts
sha256: d43e6c85c54b4ca7890e4744906d21cdb44b800d48d667a4f325ec3a40cc9841
generated_at: 2026-10-17T00:20:34.237886+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/addresses.spec.ts

## Purpose

Unit tests for the `useAddressesStore` (address-book Pinia store). The only external boundary mocked is the HTTP transport (`orvalMutator`); the store's own fetch-after-write logic executes for real. Every test pins the same invariant: after a mutation the store **replaces** its local list with the full book returned by the server rather than locally patching a single row, and exactly one entry is flagged as default.

## Key elements

- **`respondWithBook(addresses, written?)`** – Configures the `orvalMutator` mock so GET/DELETE calls return the whole book and POST/PATCH/PUT calls return the single written entry. All responses are validated against their operation schema via `parseOrvalFixture`.
- **`lastRequest()`** – Returns the axios config (`url`, `method`, `data`) of the most recent `orvalMutator` call.
- **`requestLog()`** – Returns an ordered list of `"METHOD /path"` strings for every call made so far; used to assert the exact call sequence (e.g. `PATCH` then `GET`).
- **`HOME` / `WORK`** – Two fixture address objects (one default, one not) used across all cases.
- **Test cases** (seven `it` blocks):
  - Store starts empty before any fetch.
  - `fetchAddresses` issues `GET /account/addresses` and stores the result.
  - `addAddress` issues `POST` then `GET` (reload), not a local insert.
  - `updateAddress` issues `PATCH /account/addresses/:id` then `GET`.
  - `setDefaultAddress` issues `PUT /account/addresses/:id/default` then `GET`.
  - `removeAddress` issues `DELETE /account/addresses/:id`; the promoted default comes from the server response, not a local guess.
  - A book-less payload (`data: {}`) is coerced to `[]` by the store's `?? []` guard (intentionally bypasses `parseOrvalFixture` to test the store's own defence).

## Relationships

- **`src/modules/account/stores/addresses.ts`** – The system under test; `useAddressesStore` is imported and exercised in every case.
- **`src/infrastructure/http/index.ts`** – Exports `orvalMutator`, which is replaced by a `vi.fn` mock via `vi.mock('@/infrastructure/http', …)`. No real network I/O occurs.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module top level to register the necessary module wiring before the mock takes effect.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – Provides `orvalEnvelope` (wraps a payload in the standard `{ success, status, message, data }` shape) and `parseOrvalFixture` (asserts the payload conforms to the operation's Orval-generated schema before returning it).

## Notes

- The mock's default implementation (before `respondWithBook` is called in a specific test) resolves an **empty book** (`addresses: []`); tests that need data must call `respondWithBook` explicitly.
- `vi.clearAllMocks()` runs in `beforeEach`, so `mock.calls` history does not leak between tests. A fresh Pinia instance is also created each time.
- The last test (book-less payload) **deliberately bypasses** `parseOrvalFixture` because a missing `addresses` key is schema-impossible in the real contract; the point is to pin the store's `?? []` guard in isolation.
- The `input` for `addAddress` strips `id` and `default` from the fixture (`const { id: _id, default: _default, ...input } = WORK`) to mimic what the API expects on creation.
