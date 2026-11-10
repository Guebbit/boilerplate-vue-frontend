---
source: src/modules/stats/tests/store.spec.ts
sha256: e733445d4a57b60a18033b02da61dbd2dc63fe1f9156158daaf733cf169dc90c
signature: 00916e48830770e147cf20b38e6046ab2cfb9c8625eebdd2c212ed95ec570a81
generated_at: 2026-11-10T05:52:38.031270+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/tests/store.spec.ts

## Purpose

Unit tests for the stats Pinia store. The HTTP transport (`orvalMutator`) is replaced with a router keyed on `METHOD /url` that serves canned responses validated against the API contract's own schemas. The tests pin that one `loadDashboard` call fires every block with the period's days, that responses are held untouched in the store, and that a single block failure rejects the whole load.

## Key elements

- **`wireModulesIntoCore()`** — one-time setup that wires test double modules into the application core before any test runs.
- **`figures(totalSales)`** — factory returning a full set of stat fields (orders, units, sales, taxes, AOV, etc.) for building canned currency totals.
- **`responses`** — mutable `Record<string, unknown>` of canned answers keyed by `METHOD /url`; reset in `beforeEach` for all seven dashboard endpoints plus `/stats/products/p1`.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a function that looks up `responses` by key, validates the match through `parseOrvalFixture`, and rejects with an `aProblem(404, …)` envelope for unknown routes.
- **`parametersOf(url)`** — helper that scans `orvalMutator` mock calls to extract the `params` object sent to a given URL.
- **`LIMITS`** — the `{ maxRangeDays, maxBuckets }` ceilings embedded in every canned response.
- **`describe('the period ceilings')`** — asserts `store.limits` is populated from a response (not a dedicated `/stats/limits` call) and also appears in `loadProductSales`.
- **`describe('loadDashboard')`** — verifies all blocks fire with the period, answers are stored verbatim, the pipeline endpoint receives no period, and a 404 on one block rejects the whole promise.
- **`describe('loadProductSales')`** — verifies a single-product series is fetched with the period and stored in `store.productSeries`.

## Relationships

- **`src/modules/stats/store.ts`** — the system under test; imports `useStatsStore` and exercises `loadDashboard`, `loadProductSales`, `limits`, and the per-block state fields.
- **`src/infrastructure/http/index.ts`** — `orvalMutator` is the sole HTTP entry point the store calls; this file mocks it entirely.
- **`tests/support/unit/fixtures.ts`** — provides `aProblem`, the standard error-envelope shape used for mock rejections.
- **`tests/support/unit/orval-fixture-schema.ts`** — `parseOrvalFixture` validates each canned response against the contract schema before the mock resolves it, so schema drift fails at the transport boundary.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore` injects test doubles into the module graph so the store can resolve its dependencies outside a real server.

## Notes

- The mock rejects unknown routes with a **404 problem envelope** rather than a generic `Error`; the eslint-disable on `prefer-promise-reject-errors` documents that this envelope *is* the client's rejection contract.
- `parseOrvalFixture` means a fixture that drifts from the generated schema will throw before the store ever sees it — the test fails at the transport layer, not at an assertion.
- The pipeline block (`GET /stats/pipeline`) intentionally carries **no** `params`; it is a point-in-time snapshot, not a period-scoped query.
- `parametersOf` is the only way to inspect request-level params in these tests because the mock intercepts before any real HTTP layer.
