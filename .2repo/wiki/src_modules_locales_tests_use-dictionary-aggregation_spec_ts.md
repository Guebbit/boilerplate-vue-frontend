# src/modules/locales/tests/use-dictionary-aggregation.spec.ts

## Purpose

Unit tests for the `useDictionaryAggregation` composable. Rather than mocking the network transport or the two internal loaders (`import.meta.glob` for bundled dictionaries, `orvalMutator` for API dictionaries), this spec fakes the Pinia store's three fetch methods with plain mutable variables, giving a single, narrow boundary to drive the composable's lookup logic.

## Key elements

- **`vi.mock('@/modules/locales/store.ts')`** — Replaces the entire `useLocalesStore` with an object whose fetch methods (`fetchTenants`, `fetchLanguages`, `fetchAllEntries`, `fetchApiDictionary`, `fetchBundledDictionary`) resolve from the mutable `let` variables below.
- **`vi.mock('@/infrastructure/i18n/locale-overrides.ts')`** and **`vi.mock('@/infrastructure/i18n')`** — Neutralize side-effect modules so no real i18n work happens during tests.
- **`OWN_TENANT` / `BACKEND_TENANT`** — Fixture tenant IDs (`'demo-fe'`, `'demo-be'`) matching the project's own and backend tenants.
- **`capabilities` / `tenants`** — `ref` arrays faked into the store; `capabilities` contains one `dynamic` and one `static` language entry.
- **`entry(key, value, tenant?)`** — Small factory that builds a `LocaleEntry` row with a deterministic `id`.
- **`entriesAnswer`, `apiBaselineAnswer`, `appBaselineAnswer`** — Module-level `let` variables, reassigned per test, that the mocked store fetches resolve with.
- **`beforeEach`** — Resets Pinia and all three answer variables to empty defaults.
- **`describe('useDictionaryAggregation')`** — Ten `it` blocks covering: entry-vs-baseline-vs-missing cell state, tenant-specific baseline source (own → bundled, backend → API, third-party → none), `allKeys` union, `resetPendingKeys`, `missingByTag` counting (skipping static-only languages), and the `hasBaseline` gate.

## Relationships

- **`src/modules/locales/composables/use-dictionary-aggregation.ts`** — The system under test; imported directly and exercised through its returned API (`loadLanguage`, `cellState`, `entryAt`, `baselineAt`, `isMissing`, `allKeys`, `addPendingKey`, `resetPendingKeys`, `missingByTag`, `languages`, `hasBaseline`).
- **`tests/cross-cutting/module-file-shapes.spec.ts`** — Cross-cutting suite that asserts structural conventions (file naming, export shapes, mock patterns) across spec files including this one.
- **`tests/cross-cutting/coverage-and-mutate-scope.spec.ts`** — Defines which files fall under coverage/mutation-scope enforcement; this spec's SUT path is in scope.
- **`tests/cross-cutting/published-language.spec.ts`** — Validates that the languages referenced in fixtures (e.g. `'en'`) match the project's published-language allow-list.

## Notes

- The mocking strategy is intentional and documented in the module doc comment: faking the store's fetch methods is the *only* boundary needed, avoiding separate mocks for `import.meta.glob` and `orvalMutator`. Changing the composable to bypass the store would break this approach.
- The three answer variables are plain `let` bindings, not `vi.fn()` mocks. They are reset to empty in `beforeEach`, but a test that forgets to set one will silently get `[]` or `{}` rather than a mock-implementation error.
- Tests use `.then()` chains on the returned Promise from `loadLanguage` rather than `async/await`; the `hasBaseline` checks are synchronous and require no `loadLanguage` call.
- `LocaleTenantKind` is imported from `@types` (a type alias), not from the registry module directly; the store mock supplies the enum values inline.
