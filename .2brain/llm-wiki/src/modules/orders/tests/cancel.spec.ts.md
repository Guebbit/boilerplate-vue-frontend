---
source: src/modules/orders/tests/cancel.spec.ts
sha256: ab62fd631d5c313c02fe055d61c29cd268b0535cd16395a12575720ffca3157b
generated_at: 2026-10-02T15:21:06.544422+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/cancel.spec.ts

## Purpose

Vitest spec for the `cancelOrder` action in the orders store. It mocks `orvalMutator` directly so assertions can inspect the raw request body (not just the URL) and verify the store's single customer-facing write: that the cached order record is replaced by the cancelled one, and that the refund flag is forwarded exactly as the caller expressed it.

## Key elements

- **`wireModulesIntoCore()`** — called once at module scope to bootstrap the store's dependency graph for the test environment.
- **`ORDER`** — fixture order (`anOrder({ status: 'cancelled' })`) returned as the canned cancel-endpoint response.
- **`sent`** (module-level array) — captures every config object passed to the mocked `orvalMutator`, enabling body-level assertions.
- **`responses`** (module-level record) — maps `"METHOD url"` keys to canned response payloads read by the mock.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a spy that records the config and resolves via `parseOrvalFixture`, so the store receives a well-formed envelope without a real network call.
- **`describe('cancelOrder')`** — single assertion: after the call, `store.orders.o1.status` is `'cancelled'`.
- **`describe('cancelOrder — the operator choosing what happens to the money')`** — three cases pinning the request body: no body when `refund` is omitted, `{ refund: false }`, and `{ refund: true }`.

## Relationships

- **`tests/support/unit/fixtures.ts`** — supplies the `anOrder()` factory used to build the `ORDER` fixture.
- **`tests/support/unit/wire-modules.ts`** — supplies `wireModulesIntoCore()`, which injects test doubles into the DI core before the store is instantiated.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — supplies three helpers: `orvalEnvelope` (wrap a payload in the API envelope), `parseOrvalFixture` (decode the canned response the mock returns), and `contractRequest` (validate a sent body against the generated `CancelOrderByIdBody` schema).

## Notes

- This spec intentionally does **not** test response-schema validation. That behaviour lives in `http-validate-responses.spec.ts`; here the mock bypasses validation entirely by resolving the fixture directly.
- The "no body" case is semantically significant: an absent body signals the API's default (customer cancel). Sending `{ refund: true }` in that path would fabricate a preference the caller never made.
- `parseOrvalFixture` is called with the *outgoing* method/url, not the response shape — it uses the route to pick the correct decode path for the canned payload.
