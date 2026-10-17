---
source: src/modules/stats/tests/store.spec.ts
sha256: 14f02a9631d604849444a1420c03a077ba30b274ffe63d0309839f8081f44d08
generated_at: 2026-10-17T01:44:38.494376+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/tests/store.spec.ts

## Purpose

Unit test suite for `useStatsStore`. It replaces the HTTP transport (`orvalMutator`) with a `METHOD /url`-keyed router that validates every fixture against the OpenAPI contract schemas before resolving, ensuring the store's logic is exercised against realistic, spec-shaped payloads while any contract drift fails immediately in test.

## Key elements

- **`wireModulesIntoCore()`** — called at module top-level; registers test doubles so the store's internal dependencies resolve outside a browser.
- **`figures(totalSales)`** — helper returning an object with every field the stats contract requires (orders, units, gross/net sales, shipping, taxes, etc.), parameterised by a single `totalSales` value.
- **`responses` (module-level `Record<string, unknown>`)** — the mutable table of canned answers keyed by `` `${METHOD} ${url}` ``; the mock reads from it on each call.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a router that looks up `responses`, validates the answer via `parseOrvalFixture`, and rejects with an API error-envelope shape (`{ success, status, message }`) when a key is missing.
- **`parametersOf(url)`** — inspects the recorded `orvalMutator` mock calls to extract the `params` object sent for a given URL; used to assert the store forwards the correct query parameters.
- **`beforeEach`** — resets Pinia, clears all mocks, and repopulates `responses` with fixtures for all eight dashboard endpoints plus the product-detail endpoint.
- **`describe('loadDashboard')`** — three tests: (1) all blocks fire with the correct period and answers are stored untouched; (2) `/stats/pipeline` receives *no* period params (it is a "now" snapshot); (3) a missing block causes the whole `loadDashboard` to reject.
- **`describe('loadProductSales')`** — one test verifying the single-product fetch, its `buckets` array, and the forwarded period/interval params.

## Relationships

- **`src/modules/stats/store.ts`** — the unit under test; `useStatsStore` is the only import from production code.
- **`src/infrastructure/http/index.ts`** — mocked via `vi.mock`; the real `orvalMutator` is never called, only its interface is exercised.
- **`tests/support/unit/wire-modules.ts`** — called once at module scope to inject test-level module wiring before any store is instantiated.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — provides `orvalEnvelope` (wraps a payload in the standard API envelope) and `parseOrvalFixture` (validates a fixture against the generated OpenAPI schemas for the given method+URL).

## Notes

- The mock's rejection path uses a plain object (`{ success: false, status: 404, message }`) rather than an `Error` instance; an `eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors` acknowledges this because the API's error *envelope* is the client's rejection contract.
- The store appends `limit: 10` to the `/stats/products` request params — the test asserts this rather than the caller providing it.
- `loadDashboard` is all-or-nothing: a single failing block rejects the whole Promise, so the calling page can surface a single error state.
- Fixtures must remain valid against the OpenAPI schema; `parseOrvalFixture` will throw at test time if a field name or type drifts from the generated contract.
