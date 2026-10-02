---
source: src/modules/account/tests/addresses.spec.ts
sha256: e3d0b3635c8d6ab16fae7c6d4b4c26231eca00e45dd8cce2b8bbd21625764f86
generated_at: 2026-10-02T12:20:12.838184+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/addresses.spec.ts

## Purpose

Unit tests for the `useAddressesStore` Pinia store. Only the HTTP transport (`orvalMutator`) is mocked so the store's own fetch-after-write orchestration runs for real. Every case pins the same invariant: the local list is **replaced** by the full book response, never patched with the single row a write returns, and exactly one default always exists.

## Key elements

- **`vi.mock('@/infrastructure/http', …)`** – replaces `orvalMutator` with a `vi.fn` that resolves to schema-validated fixtures by default.
- **`respondWithBook(addresses, written?)`** – reconfigures the mocked transport so GET/DELETE return the full book and write methods (POST/PATCH/PUT) return the single `written` entry; both are passed through `parseOrvalFixture` for schema validation.
- **`lastRequest()`** – returns the axios config (url, method, data) of the most recent transport call.
- **`requestLog()`** – returns an ordered array of `METHOD url` strings for every call made.
- **`describe('useAddressesStore', …)`** – the test suite covering: initial empty state, fetch, add (POST→GET), update (PATCH→GET), set-default (PUT→GET), delete (DELETE→reload), and a malformed payload fallback.

## Relationships

- **`src/infrastructure/http/index.ts`** – the source of `orvalMutator`, which is the single dependency mocked in this file. The store under test calls it; the mock intercepts those calls.
- **`tests/support/unit/wire-modules.ts`** – provides `wireModulesIntoCore()`, called at module top-level to register test stubs so the store can resolve its dependencies without a full app bootstrap.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – provides `orvalEnvelope` (wraps a payload in the API's standard envelope) and `parseOrvalFixture` (validates a response against the operation's schema), both used by every mock implementation in this file.

## Notes

- **Fetch-after-write is the contract under test.** Every write action (add, update, setDefault, remove) must be followed by a `GET /account/addresses`; the tests assert the exact `requestLog()` sequence to catch a store that skips the reload.
- **`removeAddress` is the highest-risk path.** The server promotes a new default on deletion; a store that merely splices the row locally would render a book with no default until the next fetch. The test explicitly sets up the promoted book after the DELETE.
- **The "book-less payload" test bypasses `parseOrvalFixture` on purpose.** It feeds a raw `{ data: {} }` response to pin the store's own `?? []` guard, since that shape is impossible under the real schema but could appear in a regression.
- **`respondWithBook` distinguishes by method, not URL.** GET and DELETE always get the full `addresses` array; all other methods get the single `written` entry. This mirrors the API contract where list endpoints return the book and row-mutation endpoints return the row.
