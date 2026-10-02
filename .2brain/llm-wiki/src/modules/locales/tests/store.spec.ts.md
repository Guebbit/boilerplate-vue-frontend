---
source: src/modules/locales/tests/store.spec.ts
sha256: e6ef8b224a8b2a8b0972de5ef29beed1a9738facfe4b4977ee449f7efdc0b8a0
generated_at: 2026-10-02T15:15:35.138271+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/tests/store.spec.ts

## Purpose

Unit tests for the locales Pinia store. Rather than asserting on rendered UI, the suite mocks the `orvalMutator` HTTP transport and asserts on the exact `METHOD path` sequence the store issues plus the shape of bodies it sends. This pins transport-level contracts (URLs, HTTP verbs, body fields) without a network layer.

## Key elements

- **`responses` (module-level `Record<string, unknown>`)** — Canned envelope bodies keyed by `METHOD path` (e.g. `'POST /locales'`, `'DELETE /locales/es'`). Reset in `beforeEach` via `vi.resetAllMocks()`, then repopulated.
- **`vi.mock('@/infrastructure/http')`** — Replaces `orvalMutator` with a spy that looks up `responses[\`${method} ${url}\`]` and feeds it through `parseOrvalFixture`, returning a resolved Promise.
- **`requestedUrls()`** — Helper that maps `orvalMutator.mock.calls` into an ordered array of `"METHOD url"` strings for sequential-assertion style tests.
- **`CAPABILITY` / `LANGUAGE` / `ENTRY` (const fixtures)** — Representative rows for the merged manifest, the dynamic-tier language record, and a stored entry, used as expected values in assertions.
- **`describe('fetchLanguages')`** — Verifies the store stores capabilities, default, and fallback from a `GET /locales` response.
- **`describe('language writes')`** — Pins that create/edit/remove each perform the write *then* a `GET /locales` refetch; edit omits `tag` from the body (not editable).
- **`describe('entry writes')`** — Covers `addEntry`, `editEntry` (key excluded from body), `importEntries` routing merge→PATCH vs replace→PUT, and that tenant appears in the path once, not per-row.
- **`describe('fetchAllEntries')`** — Swaps the mock implementation to serve two pages sequentially, asserting the store pages to completion.
- **`describe('entry search and removal')`** — Tests `watchSearchEntries().search()` including the `?? ''` empty-tag arm producing `GET /locales//entries`, and `removeEntry`.
- **`describe('fetchApiDictionary')`** — Verifies flattening of a nested message tree into dotted keys, and that a 404 yields an empty `{}`.

## Relationships

- **`src/infrastructure/http/index.ts`** — The sole module under mock; the test asserts every HTTP call the store makes through `orvalMutator` originates from here.
- **`tests/support/unit/wire-modules.ts`** — Called once at module scope (`wireModulesIntoCore()`) to register store modules with the core so `useLocalesStore()` resolves in the test runtime.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — Supplies `orvalEnvelope` (wrap payloads in the API's response envelope), `parseOrvalFixture` (normalize a canned body into the mutator's return shape), and `contractRequest` (validate a request body against a generated schema and return the relevant subset).

## Notes

- `vi.resetAllMocks()` (not `clearAllMocks`) is used in `beforeEach` because the pagination test swaps the mock implementation; reset restores the original table-driven mock for subsequent tests.
- `DELETE /locales/es` and `DELETE /locales/es/entries/:id` are intentionally bodyless per the real API contract — the envelope has no `data` key.
- The `editLanguage` and `editEntry` tests extract `call.data` from the mock and run it through `contractRequest` to assert the exact serialized body, guarding against accidental extra fields (e.g. `tag` leaking into the edit body).
- The empty-tag search test (`GET /locales//entries`) documents a known quirk: when `filters.tag` is unset, the URL contains a double slash. This is the `?? ''` fallback arm, not a bug to fix here.
