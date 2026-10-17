---
source: src/modules/locales/tests/store.spec.ts
sha256: 658710f9c618f26468053a396608c9405e8d14e3e73f646593b90d52106b4dda
generated_at: 2026-10-17T01:06:11.378480+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/tests/store.spec.ts

## Purpose

Unit-test suite for the locales Pinia store. It replaces the HTTP layer (`orvalMutator`) with a table-driven mock keyed by `METHOD path`, then asserts both the returned state and the exact sequence of URLs the store requested. The pattern mirrors the inventory spec: pin *what* the store calls and *in what order*, not *how* the transport works.

## Key elements

- **`responses` (module-level `Record<string, unknown>`)** — the single source of canned fixtures per `METHOD path`; reset in `beforeEach` so each test starts clean.
- **`vi.mock('@/infrastructure/http', …)`** — replaces `orvalMutator` with a stub that looks up `responses` and wraps the result via `parseOrvalFixture`.
- **`requestedUrls()`** — helper that extracts the ordered list of `METHOD path` strings from the mock's call log; used in nearly every assertion.
- **`CAPABILITY`, `LANGUAGE`, `ENTRY`** — representative fixture rows for the merged manifest, the dynamic-tier language record, and a stored entry respectively.
- **`describe` blocks** — cover `fetchLanguages`, language CRUD (create/edit/remove), entry writes (add/edit/import-merge/import-replace), `fetchAllEntries` (pagination), entry search & removal, and `fetchApiDictionary`.
- **`contractRequest(schemas.…, call.data)`** — validates that request bodies conform to the generated API schemas (e.g. `UpdateLocaleBody`, `UpdateLocaleEntryBody`, `MergeLocaleEntriesBody`).

## Relationships

- **`src/modules/locales/store.ts`** — the unit under test; `useLocalesStore` is imported and exercised in every `it`.
- **`src/infrastructure/http/index.ts`** — `orvalMutator` is the sole mock target; no real HTTP is performed.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module top-level to register test doubles in the DI container before any test runs.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — provides `parseOrvalFixture` (unwrap the transport envelope), `orvalEnvelope` (wrap a payload in the expected shape), and `contractRequest` (schema-assert a request body).

## Notes

- `beforeEach` uses `vi.resetAllMocks()` (not `clearAllMocks`) specifically so the paging test—which swaps `mockImplementation`—restores the table-driven stub for subsequent tests.
- The `DELETE /locales/es` fixture is intentionally bodyless (`orvalEnvelope()` with no payload), matching the real API contract.
- The empty-tag search test (`GET /locales//entries`) pins the `?? ''` fallback branch in the store's URL construction; the double-slash is expected, not a bug.
- `importEntries` routes to `PATCH` for merge and `PUT` for replace; the tests assert the *method* carries the delete semantics rather than a separate DELETE call.
