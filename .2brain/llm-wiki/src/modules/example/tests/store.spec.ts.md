---
source: src/modules/example/tests/store.spec.ts
sha256: f6378f58a63829272bcbf86605b8295a4af95bb04ba2fdddc67907a3fe172e02
signature: 08f0f68ba23f0a830413ced0a2625a6eb78c00ebda389de0f7a1f1800d39f0e0
generated_at: 2026-11-10T04:27:42.470147+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/tests/store.spec.ts

## Purpose

Unit tests for the `useExampleStore` Pinia store. The file mocks `orvalMutator` (the HTTP transport) so that each store action's outgoing request—URL, method, params, body, headers—can be inspected directly. Every canned response is validated against the real OpenAPI contract schema before being returned, ensuring fixtures cannot silently drift from `openapi.yaml`.

## Key elements

- **`EXAMPLE`** – Canonical record shape returned by the mocked API; used as the default response body.
- **`defaultAnswer`** – `vi.hoisted` mutable slot holding the current default transport answer function; lets the mock factory and test bodies share one reference.
- **`vi.mock('@/infrastructure/http')`** – Replaces `orvalMutator` with a `vi.fn` that delegates to `defaultAnswer.current`.
- **`lastRequest()`** – Returns the config object (url, method, data, params) from the most recent `orvalMutator` call.
- **`lastBody(schema)`** – Extracts the JSON body of the last request and validates it against a `ZodType` via `contractRequest`.
- **`answerWithPage(items)`** – Overrides the transport to respond with a paginated envelope (`{ items, meta }`) validated by the schema.
- **`keyOfLastRequest()`** – Reads the `Idempotency-Key` header from the last call's second argument.
- **`describe` blocks** – Cover `search`, `fetchExample`, `createExample` (plain + idempotency), `transitionExample`, `updateExample`, `deleteExample`, `setCover`, and `fetchPublished`.

## Relationships

- **`src/modules/example/store.ts`** – The module under test; `useExampleStore` is the sole subject of every assertion.
- **`src/infrastructure/http/index.ts`** – Source of `orvalMutator`; fully mocked so no real HTTP occurs.
- **`tests/support/unit/orval-fixture-schema.ts`** – Supplies `parseOrvalFixture` (validates canned responses) and `contractRequest` (validates outgoing bodies).
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called once at module scope to register module boundaries needed by the store.
- **`@api/schemas`** – Imported for concrete `ZodType` instances (`CreateExampleBody`, `UpdateExampleByIdBody`) used in `lastBody` assertions.

## Notes

- Tests **return** their promise chains instead of `await`-ing; vitest treats a rejected returned promise as a test failure, making the `.then`-based assertions equally binding. See `docs/tools/unit-testing.md`.
- `vi.hoisted` is required for `defaultAnswer` because the `vi.mock` factory executes before any `const` in the file is initialized.
- `beforeEach` resets the mock implementation back to `defaultAnswer.current` after every test that calls `answerWithPage` or `mockImplementationOnce`, preventing cross-test leakage.
- `addExampleRecord(... as never)` is used to seed the store's internal cache without going through the API; the `as never` cast sidesteps a type mismatch in the test-only helper.
