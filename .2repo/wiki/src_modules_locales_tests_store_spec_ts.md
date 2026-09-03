# src/modules/locales/tests/store.spec.ts

## Purpose

Vitest spec for `useLocalesStore` that drives the store through a mocked `orvalMutator` transport and asserts on both the returned data and the exact `METHOD path` sequence of HTTP calls. It pins behavioural contracts that are easy to regress: manifest refetch after every language write, tag immutability on edit, search-cache coherence on entry writes, and pagination/search/dictionary-shape semantics.

## Key elements

- **`responses`** – mutable `Record<string, unknown>` mapping `"METHOD path"` keys to canned payloads; reset in `beforeEach`.
- **`vi.mock('@/infrastructure/http', …)`** – factory mock that resolves `orvalMutator(config)` by looking up `responses[`${method} ${url}`]`.
- **`requestedUrls()`** – helper that reads `orvalMutator` mock calls and returns an ordered `["METHOD path", …]` array for assertions.
- **Fixtures** – `CAPABILITY` (merged manifest row), `LANGUAGE` (dynamic-tier write response), `ENTRY` (stored entry row).
- **`describe` blocks** – `fetchLanguages`, `language writes`, `entry writes`, `fetchAllEntries`, `entry search and removal`, `fetchApiDictionary`, `entriesPageTotal`, `fetchBundledDictionary`, `the tenant registry`.
- **`beforeEach`** – creates a fresh Pinia instance, calls `vi.resetAllMocks()` (not `clear`), and re-seeds `responses`.

## Relationships

- **`src/infrastructure/http/index.ts`** – the sole external dependency. The file factory-mocks this module so that `orvalMutator` becomes a `vi.fn()` returning promises from the `responses` table. No other module is imported directly.

## Notes

- `vi.resetAllMocks()` is used deliberately (not `clearMocks`) because the `fetchAllEntries` paging test swaps `orvalMutator`'s implementation inline; a full reset restores the table-driven mock for subsequent tests.
- The `?? ''` arm in the search test asserts a URL with an empty path segment (`GET /locales//entries`), confirming the store passes the filter tag verbatim even when absent.
- `fetchApiDictionary` 404 is treated as "no file" (returns `{}`), not an error — a dynamic-only language is the expected case for a freshly added one.
- Import routing is method-semantic: `merge` → `PATCH`, `replace` → `PUT`; the test asserts the method, not just the path.
