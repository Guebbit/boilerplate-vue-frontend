# src/modules/wishlist/tests/store.spec.ts

## Purpose

Integration-style tests for the wishlist Pinia store. Rather than unit-testing in isolation, the spec exercises the real store, real generated client, and real cart store against a transport-mocked `orvalMutator`, verifying the store's coordination invariants: whole-list replacement on every mutation and the cross-module side-effect where `moveToCart` refetches the cart.

## Key elements

- **`vi.mock('@/infrastructure/http', …)`** — Replaces `orvalMutator` with a router that resolves `responses["METHOD /url"]`. Everything above the transport stays real.
- **`responses` (module-level `Record<string, unknown>`)** — Reset in `beforeEach`; maps HTTP method+path to canned payloads for `/wishlist`, `/wishlist/:id`, `/wishlist/:id/move-to-cart`, and `/cart`.
- **`requestedUrls()`** — Reads `orvalMutator` mock calls and returns the sequence of URLs hit; used to assert which endpoints the store actually called.
- **`describe('fetchWishlist')`** — Verifies the store replaces `items` and that `isSaved` reflects the new id-set.
- **`describe('addToWishlist')`** — Confirms the store renders the API-returned full list (not a local append) and that a newly saved product makes *other* products in the response visible to `isSaved`.
- **`describe('removeFromWishlist')`** — Confirms removal renders the server's remaining list, not a local splice.
- **`describe('moveToCart')`** — Verifies the item drops from the wishlist **and** that `/cart` is the last URL requested (the cross-module cart-refresh effect).

## Relationships

- **`src/infrastructure/http/index.ts`** — The sole graph neighbor. The test imports `orvalMutator` from this module and replaces it via `vi.mock`. The mocked function is the only boundary; the real Orval-generated client and the real cart store that call through it remain in the test's execution path.

## Notes

- The mock key format is `METHOD /url` (e.g. `"POST /wishlist/p1/move-to-cart"`). Adding a new endpoint to a test requires adding a matching key to `responses`; a missing key resolves to `undefined` and surfaces as a runtime error, not a clean assertion failure.
- The test philosophy is explicitly "whole-list replacement": the store never appends or splices locally. A test that only checks one product's presence would pass with a buggy local-append store; the `addToWishlist` test deliberately asserts `isSaved('p2')` to catch that regression.
- Pinia is re-created in every `beforeEach` (`setActivePinia(createPinia())`), so tests are stateless across runs. No store state persists between test cases.
