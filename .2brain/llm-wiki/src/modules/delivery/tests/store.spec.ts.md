---
source: src/modules/delivery/tests/store.spec.ts
sha256: 2601acc751018e032e52cf62ee3b5bf9fb758479ba88c2c1c51dc4b2a6600a96
generated_at: 2026-10-17T00:50:24.071788+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/tests/store.spec.ts

## Purpose

Unit test suite for the delivery Pinia store (`useDeliveryStore`). It pins down that every store method mirrors the API contract: reads fill the correct state slices, writes send the exact body the schema accepts, and failures propagate as rejections rather than being silently swallowed. The transport layer is fully mocked so no real HTTP occurs.

## Key elements

- **`responses`** — module-level `Record<string, unknown>` keyed by `"METHOD /url"`, reset in `beforeEach`. Each test may override an entry to simulate a specific API answer or inject an `Error` to trigger a rejection path.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a function that looks up `responses` by request key; resolves via `parseOrvalFixture` or rejects with the `rejectWith` envelope.
- **`rejectWith(status, message)`** — builds the `{ success: false, status, message, errors }` shape the store's `onResponseReject` handler expects.
- **`sentBody(method, url)`** — async helper that inspects `orvalMutator` mock calls to retrieve the `data` payload a write sent, used with `contractRequest` for schema-level body assertions.
- **`summaryPage(productId, pageNumber)`** — builds a paginated `orvalEnvelope` for preorder-summary tests.
- **`describe` blocks** — one per store method/area: `fetchMethods`, `fetchFulfillmentForOrder`, `start`, `ship`, `fulfill`, `hold and release`, `the preorder board reads` (and further, truncated).

## Relationships

- **`src/modules/delivery/store.ts`** — the unit under test; every `describe` block exercises a method exported from `useDeliveryStore`.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called once at module scope to register the module's DI bindings before any test runs.
- **`tests/support/unit/fixtures.ts`** — provides realistic fixture factories (`aFulfillmentOrder`, `aPreorderFulfillmentOrder`, `aPreorderSummary`, `aShipment`, `aShop`) used to build mock responses.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — supplies `orvalEnvelope` (wraps a payload in the API envelope), `parseOrvalFixture` (validates the mock answer against the orval schema before resolving), and `contractRequest` (validates a sent body against an `@api/schemas` type before asserting equality).

## Notes

- The `beforeEach` resets Pinia (`setActivePinia(createPinia())`) **and** the `responses` map, so no test leaks state into the next.
- Error simulation is done by assigning an `Error` instance to the relevant `responses` key; the mock's `instanceof Error` branch converts it to a 500 rejection envelope.
- `contractRequest` is the bridge between "the store sent *something*" and "the store sent *exactly the contract-shaped body*"; without it, a shallow `toEqual` would miss schema-conformance issues.
- The file follows the same transport-mock pattern as the wishlist spec (noted in the module doc-block), keeping the test topology uniform across domain modules.
- `sentBody` uses a dynamic `import('@/infrastructure/http')` to get the mocked module handle at call time rather than capturing it at the top level.
