---
source: src/modules/wishlist/tests/store.spec.ts
sha256: 86a5a29d742535f12944d1612cd93c097b5e566f3813f733f9bced7a97b14e6a
signature: 152db5401f588c8d2bdbe3e44858276d3943b390d1893c07cbc6ead67bca3a81
generated_at: 2026-11-10T06:21:07.777414+00:00
model: ollama:qwen3.8:27b
---

# src/modules/wishlist/tests/store.spec.ts

## Purpose

Unit-test suite for `useWishlistStore` that verifies the store's contract: it renders only API-answered lists (never local mutations), deduplicates concurrent `ensureWishlist` calls, toasts failures exactly once, and fires the single cross-module side effect (`moveToCart` → cart refetch). The HTTP transport is mocked at the `orvalMutator` boundary so the generated client, cart store, and wishlist store all run for real.

## Key elements

- **`responses`** – module-level `Record<string, unknown>` keyed by `` `${METHOD} ${url}` ``; each test (or the `beforeEach` default) sets the canned fixture the mocked transport will return.
- **`vi.mock('@/infrastructure/http')`** – replaces `orvalMutator` with a function that looks up `responses` by `METHOD /url`, parses the result through `parseOrvalFixture`, and records every call for assertions.
- **`requestedUrls()`** – helper that extracts the `url` field from every recorded `orvalMutator` call, in call order, for asserting which endpoints were hit.
- **`beforeEach`** – creates a fresh Pinia instance, clears mocks, and populates `responses` with the default five-endpoint fixture set (`GET /wishlist`, `POST /wishlist/items`, `DELETE /wishlist/items/p1`, `POST /wishlist/items/p1/move-to-cart`, `GET /cart`).
- **`describe('fetchWishlist')`** – asserts the store replaces `items` and the derived `isSaved` id-set.
- **`describe('addToWishlist')`** – asserts the API-answered list is rendered (both products present), and that the request body carries `{ productId }` via `POST /wishlist/items`.
- **`describe('removeFromWishlist')`** – asserts the store renders the API-answered shortened list, not a local splice.
- **`describe('moveToCart')`** – asserts the item is no longer saved **and** that the last transport call was `GET /cart` (cross-module refetch).
- **`describe('ensureWishlist')`** – covers call-dedup (N concurrent callers → 1 request), single-toast-on-failure, and that a failed read is retried on the next call.
- **`describe('when the person changes')`** – sets `session.viewer`, loads the wishlist, then clears the viewer; asserts state resets and a subsequent `ensureWishlist` issues a fresh `GET /wishlist`.

## Relationships

- **`src/modules/wishlist/store.ts`** – the system under test; every assertion targets `useWishlistStore()` state and methods.
- **`src/infrastructure/http/index.ts`** – this test file imports `orvalMutator` from this module and supplies a mock implementation (keyed on `METHOD /url`) so the generated HTTP client and the cart store execute against the canned fixtures.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called once at module load to register the cart store (and other module wiring) with the global app context before any test runs.
- **`tests/support/unit/orval-fixture-schema.ts`** – `parseOrvalFixture(method, url, raw)` validates the canned fixture against the expected wire schema and returns the typed object the mocked transport resolves.

## Notes

- The mock upper-cases `config.method` before building the lookup key, so tests can store keys in either case.
- The whole-list-replacement contract is the central property under test: several tests explicitly note (in comments) that a locally-mutating store would diverge after two tabs save different products. These are the behavioral invariants the suite guards.
- `ensureWishlist` failure tests use `vi.mocked(orvalMutator).mockRejectedValueOnce(...)` to inject a single 500, then verify `addMessage` on the notifications store is called exactly once with the first error message.
- The session-change test relies on `nextTick()` after clearing `session.viewer` to let the store's reactive reset flush before asserting `items` is empty.
- `responses` values can be either a plain object or a `Promise.reject(...)` (see the "reads again after a failed read" test), so the mocked transport's `Promise.resolve(parseOrvalFixture(...))` must handle both shapes correctly.
