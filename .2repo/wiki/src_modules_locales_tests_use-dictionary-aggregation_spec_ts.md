# src/modules/locales/tests/use-dictionary-aggregation.spec.ts

## Purpose

Unit tests for the `useDictionaryAggregation` composable, exercising its three-source aggregation (stored entries, API baseline, bundled baseline) by faking the `useLocalesStore` with plain reactive refs rather than mocking the underlying transport layer (`import.meta.glob`, `orvalMutator`).

## Key elements

- **`vi.mock('@/modules/locales/store.ts', …)`** — replaces `useLocalesStore` with a factory that returns reactive refs (`capabilities`, `tenants`, `loading`) and `vi.fn` fetches (`fetchAllEntries`, `fetchApiDictionary`, `fetchBundledDictionary`, `fetchTenants`, `fetchLanguages`).
- **`vi.mock('@/infrastructure/i18n/locale-overrides.ts', …)`** — stubs `fetchLocaleOverrides` to resolve `{}`.
- **`vi.mock('@/infrastructure/i18n', …)`** — stubs `updateLocale` to resolve immediately.
- **`entriesAnswer` / `apiBaselineAnswer` / `appBaselineAnswer`** — module-level `let` variables set per test to control what the faked fetches resolve with.
- **`entry(key, value, tenant?)`** — helper that builds a `LocaleEntry` fixture row.
- **`beforeEach`** — re-activates a fresh Pinia instance and resets all three answer variables to empty defaults.
- **`describe('useDictionaryAggregation')`** — nine `it` blocks covering:
  - Entry overrides baseline (cellState `'entry'`).
  - Baseline without an entry (cellState `'baseline'`).
  - Key with neither source (cellState `'missing'`).
  - Backend tenant reads the API baseline, not the bundled one.
  - Third-party tenant sees no baseline at all.
  - `allKeys` is the union of entry keys, baseline keys, and pending keys.
  - `resetPendingKeys` clears pending keys but preserves saved keys.
  - `missingByTag` counts per-language and skips static-only languages.
  - `hasBaseline` is `true` for own/backend tenants, `false` for others.

## Relationships

- **`src/modules/locales/composables/use-dictionary-aggregation.ts`** — the system under test; imported and exercised in every test case.
- **`tests/cross-cutting/module-file-shapes.spec.ts`** — cross-cutting suite that likely validates structural conventions of this file.
- **`tests/cross-cutting/coverage-and-mutate-scope.spec.ts`** — cross-cutting suite that likely asserts coverage/mutation-scope expectations for this spec.
- **`tests/cross-cutting/published-language.spec.ts`** — cross-cutting suite in the same locales test area; shares fixture conventions (tenant ids, language tags).

## Notes

- The mock strategy is intentional and documented in the file header: `fetchBundledDictionary` goes through `import.meta.glob` (not `orvalMutator`), so mocking the store's three fetches directly avoids mocking two unrelated loaders.
- The faked store uses **plain `ref` variables** (`capabilities`, `tenants`) that are shared across all tests in the file, not re-created per test. Only the answer variables (`entriesAnswer`, etc.) are reassigned per test.
- `OWN_TENANT` (`'demo-fe'`) and `BACKEND_TENANT` (`'demo-be'`) are hardcoded fixture ids that must match whatever the store mock exposes as `ownTenant` and the `tenants` array; changing them requires updating both the constants and the mock factory.
- Tests that call `board.loadLanguage('en')` use the returned Promise (`.then(…)` pattern) rather than `await`, consistent with the Vitest style in this repo.
