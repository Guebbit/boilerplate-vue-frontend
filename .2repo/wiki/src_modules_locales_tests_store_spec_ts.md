# src/modules/locales/tests/store.spec.ts

## Purpose

Unit tests for the locales Pinia store (`useLocalesStore`). It uses a transport-mock pattern — `orvalMutator` is replaced with a lookup table keyed by `"METHOD path"` — to verify the exact API call sequences the store issues and to assert on the shape of the data it returns to the board, without a live HTTP layer.

## Key elements

- **`CAPABILITY`, `LANGUAGE`, `ENTRY`** — fixture objects capturing the three distinct API response shapes (merged manifest row, dynamic-tier `Language` record, stored entry row).
- **`responses: Record<string, unknown>`** — the canned-response table, re-seeded in `beforeEach`. Keys are strings like `'POST /locales/es/entries'`.
- **`vi.mock('@/infrastructure/http', …)`** — replaces `orvalMutator` with a function that resolves `responses[METHOD url]`, so every HTTP call is a table lookup.
- **`requestedUrls()`** — extracts the ordered list of `"METHOD path"` strings from `orvalMutator.mock.calls`; used to assert call sequences.
- **`beforeEach`** — creates a fresh Pinia, calls `vi.resetAllMocks()`, and re-populates `responses`.
- **Test suites** — `fetchLanguages`, `language writes`, `entry writes`, `fetchAllEntries` (pagination), `entry search and removal`, `fetchApiDictionary`, `entriesPageTotal`, `fetchBundledDictionary`, `the tenant registry`.

## Relationships

- **`src/infrastructure/http/index.ts`** — the sole external dependency under test. Its `orvalMutator` export is the target of `vi.mock('@/infrastructure/http', …)`; the test intercepts every HTTP call the store makes through this single transport function and asserts on the resulting URL/method sequences.

## Notes

- `vi.resetAllMocks()` is used (not `clearAllMocks`) because the pagination test (`fetchAllEntries`) swaps the mock implementation; a full reset restores the table-driven stub for any test that runs after it.
- Language writes (create / edit / remove) each issue a **two-call** sequence: the mutation, then a `GET /locales` refetch. The tests pin this ordering explicitly.
- `editLanguage` must **not** include `tag` in the request body (it is the identity, not a field); `editEntry` must send only `value` (key is identity).
- `importEntries` with mode `"merge"` routes to **PATCH**; mode `"replace"` routes to **PUT**. The HTTP method carries the deletion semantics.
- `fetchApiDictionary` returning a 404 resolves to `{}` (not a rejection) — a dynamic-only language with no deployed file is the expected case.
- The search test for a missing tag asserts the URL `GET /locales//entries` (double slash), exercising the store's `?? ''` fallback for an absent `tag` filter.
