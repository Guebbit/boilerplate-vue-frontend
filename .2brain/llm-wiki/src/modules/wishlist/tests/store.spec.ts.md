---
source: src/modules/wishlist/tests/store.spec.ts
sha256: 0e0eece746f6111d79e0cced85e20cc2e6eb109cdcf107ea5d34d59492e06abd
generated_at: 2026-10-17T01:55:41.377263+00:00
model: ollama:qwen3.8:27b
---

# src/modules/wishlist/tests/store.spec.ts

## Purpose

Unit-test suite for the wishlist store that verifies its **coordination** behaviors—whole-list replacement on every mutation, the single cross-module side-effect (move-to-cart re-fetching the cart), idempotent `ensureWishlist`, and session-change invalidation. It mocks only the HTTP transport (`orvalMutator`) so the generated client, the cart store, and the wishlist store under test all run for real.

## Key elements

- **`wireModulesIntoCore()`** – called once at module top-level to register Pinia plugins / module wiring before any test runs.
- **`responses: Record<string, unknown>`** – mutable dictionary keyed on `"METHOD /url"`; each test (or `beforeEach`) sets the canned payload the mocked transport will return.
- **`vi.mock('@/infrastructure/http', …)`** – replaces `orvalMutator` with a function that looks up `responses` by method + URL and resolves via `parseOrvalFixture`, so the real generated client and stores execute unchanged.
- **`requestedUrls()`** – helper that extracts the URL from every recorded `orvalMutator` call, in order, for assertions.
- **`beforeEach`** – creates a fresh Pinia, clears all mocks, and seeds default responses for the five wishlist/cart endpoints.
- **Test suites** – `fetchWishlist`, `addToWishlist`, `removeFromWishlist`, `moveToCart`, `ensureWishlist`, and `"when the person changes"`, each asserting on store state *and* the sequence of transport calls.

## Relationships

- **`src/modules/wishlist/store.ts`** – the system under test; imported as `useWishlistStore`.
- **`src/infrastructure/http/index.ts`** – its `orvalMutator` export is the single mock boundary; everything above it (generated client, cart store) runs unmocked.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore` is invoked at module load to ensure the Pinia/vue-module wiring exists for the tests.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – provides `orvalEnvelope` (wraps a payload in the API envelope shape) and `parseOrvalFixture` (validates/normalises the canned response before it is resolved).

## Notes

- The mocking convention mirrors the account-store flows spec: only the transport is faked; the property under test is **coordination between stores**, not HTTP serialization.
- Whole-list replacement is intentional: `addToWishlist` asserts that saving one product also makes the *other* already-known product readable (`isSaved('p2')`), preventing a local-append implementation from drifting out of sync with the server.
- `ensureWishlist` is asserted to issue exactly **one** `GET /wishlist` for N concurrent callers, and to **re-issue** the read after a rejected promise (failure is not cached).
- The session-change test mutates `useSessionStore().viewer` directly and relies on `nextTick()` to let the store's watcher flush before asserting the reset.
