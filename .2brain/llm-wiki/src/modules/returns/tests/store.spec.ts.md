---
source: src/modules/returns/tests/store.spec.ts
sha256: 5ad8551d4ed8771fc41cd72f23819c20e0889a729e28775bb22c0c8c4034a7e0
signature: 5ad8551d4ed8771fc41cd72f23819c20e0889a729e28775bb22c0c8c4034a7e0
generated_at: 2026-11-10T05:40:59.539609+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/tests/store.spec.ts

## Purpose

Unit tests for `useReturnsStore` that verify, against a mocked `orvalMutator` transport, three things per action: the exact request body sent (validated against the API contract's own request schemas), the correct cache mutation on the store, and header invariants (e.g. Idempotency-Key on mutating calls). Catches request-shape drift before it surfaces as a 422 in production.

## Key elements

- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a spy that records every call into `sent[]` and resolves with a canned body looked up from `responses` keyed by `"METHOD /path"`, parsed through `parseOrvalFixture`.
- **`sent`** — module-level array capturing `{ url, method, data, params, headers }` for every outgoing request; reset in `beforeEach`.
- **`responses`** — module-level `Record<string, unknown>` of canned server bodies, also reset in `beforeEach`.
- **`wireModulesIntoCore()`** — called once at module top-level (not inside a hook) to register test-side module overrides before any test runs.
- **`contractRequest(schema, body)`** — validates a sent body against an `@api/schemas` request schema and returns the parsed/normalized form for assertion.
- **`aReturn(overrides?)`** — fixture factory producing a well-formed return object; used to build canned responses with specific statuses/fields.
- **Test groups** — `openReturn`, null-response guards, staff moves (`approve` / `decline` / `receive`), `recordProof`, `close`, `cancel`, `fetchOrderReturns`, `fetchReturnOptions`.

## Relationships

- **`src/modules/returns/store.ts`** — the module under test; the spec imports `useReturnsStore` and exercises every public action.
- **`tests/support/unit/orval-fixture-schema.ts`** — supplies `contractRequest` (schema-validating equality) and `parseOrvalFixture` (response deserialization used inside the mock).
- **`tests/support/unit/fixtures.ts`** — supplies the `aReturn()` factory used to build canned response bodies.
- **`tests/support/unit/wire-modules.ts`** — supplies `wireModulesIntoCore()`, called at import time to ensure the Pinia/http module graph is wired for unit-level isolation.

## Notes

- `wireModulesIntoCore()` runs **once at module scope**, not per-test; forgetting this import will cause the mock to miss module-resolution wiring.
- The mock's `parseOrvalFixture` means canned responses must conform to the orval-generated response schemas — a malformed fixture will throw at parse time, not at assertion time.
- Null-response tests (`mockResolvedValueOnce(undefined)`) override the canned-`responses` mechanism entirely; they test the store's defensive path, not the normal happy path.
- `Idempotency-Key` is asserted only on `openReturn` and `receive` (the two idempotent-write endpoints); it is **not** expected on `approve`, `decline`, `close`, `cancel`, or `recordProof`.
- `close` and `cancel` explicitly assert `sent[0].data` is `undefined` when no note is provided — the store omits the body rather than sending `{}`.
