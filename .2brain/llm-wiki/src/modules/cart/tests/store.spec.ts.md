---
source: src/modules/cart/tests/store.spec.ts
sha256: 2729dc0119c14edb0a61fd25a863009a55b91ea9be36662f63dceafb20098f82
generated_at: 2026-10-17T00:44:11.378451+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/store.spec.ts

## Purpose

Unit tests for the `useCartStore` Pinia store. They verify three invariants called out in the module doc-block: every mutating action replaces local cart state with the API payload, summary getters survive an unfetched (guest) cart, and checkout surfaces both success and failure rather than silently swallowing rejections.

## Key elements

- **`CART`, `EMPTY_CART`, `ORDER`** — static fixture payloads (one-line/two-unit cart, empty cart, checkout order) used across the suite.
- **`RESPONSES`** — object of canned API responses, each wrapped with `contractEnvelope` / `contractResponse` so every fixture is validated once against its generated OpenAPI schema at module load.
- **`cartTotalling(totalPrice)`** — builds a `GetCartResponse` envelope with an overridden `summary.totalPrice` for parameterised tests.
- **`apiFailure(status)` / `apiFailure409()`** — produce the plain-object rejection envelope the HTTP client emits (intentionally *not* an `Error`).
- **`lastIdempotencyKey()`** — inspects the `Idempotency-Key` header on the most recent mocked `apiCheckout` call.
- **`signInAs(id?)`** — sets `sessionStore.viewer` directly and returns `nextTick()` so Vue watchers flush before assertions.
- **`vi.mock('@api', …)`** — replaces every `@api` function with a `vi.fn` that resolves to the corresponding `RESPONSES` entry by default.
- **`describe` blocks** — cover: `fetchSummary` (badge seeding, 401 → empty, 500 → reject), unfetched initial state, `fetchCart`, `addCartItem`, `updateCartItem`, `removeCartItem`, `clearCart`, `setShippingMethod`, and (truncated) `checkout` / `reorder`.

## Relationships

- **`src/modules/cart/store.ts`** — the system under test; imports `useCartStore` and exercises its actions and getters.
- **`tests/support/unit/cart-fixtures.ts`** — supplies the `Answer<T>` type and `answered` helper used to type the `RESPONSES` entries.
- **`tests/support/unit/fixtures.ts`** — supplies `anOrder(…)` used to build the `ORDER` checkout fixture.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — supplies `contractEnvelope` and `contractResponse`, the schema-validation wrappers that make every fixture conform to the generated OpenAPI types.

## Notes

- Every fixture in `RESPONSES` is type-checked against its operation's generated schema at module-evaluation time. If the API contract changes and the fixture is not updated, the entire file fails before a single test runs.
- `apiFailure` rejects with a plain object, not an `Error`, because that is the rejection shape the HTTP client's `onResponseReject` produces; an eslint-disable comment documents the deviation.
- The `clearCart` test asserts **zero arguments** were passed, explicitly guarding the design decision to use `DELETE /cart/all` (no body) rather than an overloaded `DELETE /cart/:id?`.
- `fetchSummary` maps a 401 to `undefined` (guest has no cart) but re-throws any other status code; the tests assert both branches.
- `signInAs` mutates the session store synchronously and returns `nextTick()`, so callers must `.then()` on it before asserting on store state that depends on the viewer.
