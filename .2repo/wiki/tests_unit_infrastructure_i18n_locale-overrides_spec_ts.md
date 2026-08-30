# tests/unit/infrastructure/i18n/locale-overrides.spec.ts

## Purpose

Unit tests for the runtime locale-override tier (`src/infrastructure/i18n/locale-overrides.ts`). Every test defends two invariants: (1) no function ever rejects — the bundled locale JSON is the floor and all remote tiers must degrade to it; and (2) the merge of overrides over bundled strings is deep and per-key, so a single edited string never wipes its siblings.

## Key elements

- **`@api` mock** — `vi.mock('@api', …)` preserves the real module (generated const objects) via `importOriginal`, then swaps only `getLocales` and `getLocaleMessages` for `vi.fn()` stubs (`getLocalesMock`, `getLocaleMessagesMock`).
- **`capability(tag, tenants?)`** — helper that shapes a single locale row as `GET /locales` would return it, including the `tenants` array that distinguishes `api`-only, `app`-only, and both capabilities.
- **`describe('fetchRemoteLocales')`** — verifies it returns only tenant-bearing language tags, drops tags with an empty `tenants` array, and resolves `[]` on network failure or missing endpoint.
- **`describe('fetchLocaleOverrides')`** — verifies it passes the locale tag plus `{ tenant: 'demo-fe' }` to the API, and resolves `{}` on both network errors and a 404/undefined response.
- **`describe('mergeRemoteLocales')`** — verifies it mutates the shared `supportedLanguages` array (adding remote-only languages), is idempotent across repeated calls, and leaves the array untouched when the API is unreachable.
- **`describe('withLocaleOverrides')`** — verifies deep per-key merge of fetched overrides over bundled strings, that overrides alone form the dictionary for an un-bundled language, and that the bundled copy is returned when the fetch fails.
- **`beforeEach` / `afterEach`** — snapshot and restore `supportedLanguages` (module-level mutable state shared with the app instance) so the mutation tests don't leak.

## Relationships

No graph neighbors were provided.

## Notes

- The test file uses top-level `await import(…)` (Vitest ESM dynamic import) rather than static imports, so the mocked `@api` module is fully constructed before the module under test is loaded.
- `supportedLanguages` is **mutable module state** — the tests must snapshot/restore it manually; there is no framework isolation for it.
- The `@api` mock intentionally spreads `importOriginal` first so that non-network exports (e.g., generated constant maps) remain available to the module under test.
- The "tenant" parameter sent to `getLocaleMessages` is hardcoded to `'demo-fe'` in the assertion, reflecting that this frontend only ever requests its own dictionary.
