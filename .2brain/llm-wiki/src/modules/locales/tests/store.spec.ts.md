---
source: src/modules/locales/tests/store.spec.ts
sha256: 43c4d1f41a5a01e31a1694455d7969d52b064d5465a5a9a2857fc151372ec2e4
signature: c2f7bfc6ca65fa9204d2811fd19df24c6465cd4fe6146a140297eb4418126c85
generated_at: 2026-11-10T04:45:09.562758+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/tests/store.spec.ts

## Purpose

Unit tests for the locales Pinia store (`useLocalesStore`). Driven entirely by mocking the `orvalMutator` transport with canned `METHOD path → response` pairs, then asserting on both store state and the exact URLs the mock received. Exists to lock down the store's fetch, write, pagination, search-cache, and contract-body behaviors without hitting a real network.

## Key elements

- **`LANGUAGE` / `ENTRY`** — Fixture objects representing the canonical shape a language and a locale entry take across all endpoints.
- **`responses`** — A per-test `Record<string, unknown>` mapping `"METHOD /path"` keys to the body the mock should return; reset in `beforeEach`.
- **`vi.mock('@/infrastructure/http')`** — Replaces `orvalMutator` with a function that looks up `responses[key]` and wraps the result via `parseOrvalFixture`.
- **`requestedUrls()`** — Helper that flattens `orvalMutator`'s mock calls into an ordered `["METHOD /path", …]` array for assertions.
- **`contractRequest(schema, body)`** — From `orval-fixture-schema.ts`; validates a request body against an `@api/schemas` contract and returns the validated payload. Used to assert that write bodies exclude non-editable fields (e.g. `tag`).
- **`describe` blocks** — Cover: `fetchLanguages`, `fetchLanguage`, language writes (create/edit/remove), entry writes (add/edit/import-merge/import-replace), `fetchAllEntries` pagination, and entry search & removal.

## Relationships

- **`src/modules/locales/store.ts`** — The system under test; `useLocalesStore` is the sole store exercised.
- **`src/infrastructure/http/index.ts`** — Source of `orvalMutator`, which is the only network boundary the mock replaces.
- **`tests/support/unit/orval-fixture-schema.ts`** — Supplies `parseOrvalFixture` (wraps raw fixture bodies into the Orval response envelope) and `contractRequest` (schema-level body validation).
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module top-level to register the locales module (and its dependencies) with the core container before tests run.

## Notes

- `beforeEach` uses `vi.resetAllMocks()` (not `clear`) because the pagination test swaps the mock implementation inline; a reset restores the table-driven version for subsequent tests.
- The `DELETE` responses are intentionally `undefined` (bodyless), matching the real API contract — distinct from the write endpoints that return a body.
- The search test for an empty tag expects the URL `GET /locales//entries` (double slash), documenting the `?? ''` fallback in the store's URL construction.
- The import-entries tests pin the HTTP method as the semantic discriminator: `merge → PATCH`, `replace → PUT`, so the method itself carries the "deleting" semantics.
- Tests are async via returned Promises (`.then`) rather than `async/await`, consistent with the project's existing spec style.
