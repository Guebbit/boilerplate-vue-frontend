---
source: src/modules/locales/tests/use-dictionary-aggregation.spec.ts
sha256: f832a9fc2188d784177968f0482f1a3fd7b4f5706fdfbfbe6ea0a1a972abca16
signature: 140cad693ebba7527f651e6cb22f2cc1b2ce49bf02fc1ab70e7ff2939f75e895
generated_at: 2026-11-10T04:45:39.530420+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/tests/use-dictionary-aggregation.spec.ts

## Purpose

Vitest suite that exercises the `useDictionaryAggregation` composable end-to-end at the store boundary. Instead of mocking the HTTP transport, it fakes the three fetch methods on `useLocalesStore` (entries, API baseline, bundled baseline) with plain mutable refs, so each test only sets the data it cares about and asserts on the composable's cell-state, key-union, and write-aftermath logic.

## Key elements

- **Module-level fixtures** — `OWN_APP` (`'demo-fe'`), `BACKEND_APP` (`'demo-be'`), `capabilities` (one dynamic, one static-only language), `apps` (frontend + backend registry rows).
- **`entry(key, value, app?)`** — helper that builds a single `LocaleEntry` row for test data.
- **`entriesAnswer` / `apiBaselineAnswer` / `appBaselineAnswer`** — mutable per-test variables that the faked store's fetch methods resolve with; reassigned inside each `it`.
- **`vi.mock('../store.ts')`** — replaces `useLocalesStore` with an object whose `fetchAllEntries`, `fetchApiDictionary`, and `fetchBundledDictionary` return the above variables. This is the critical boundary because `fetchBundledDictionary` uses `import.meta.glob`, not the shared `orvalMutator` transport.
- **`vi.mock('@/infrastructure/locale-overrides.ts')`** — replaces `refreshRunningLocale` with a module-level `vi.fn` so the `afterWrite` test can assert it was called with the correct locale tag.
- **`beforeEach`** — creates a fresh Pinia instance and resets all three answer variables to empty.
- **Test cases** (11 total) covering: cell-state triad (entry / baseline / missing), baseline source selection by app kind (frontend → bundled, backend → API, third-party → none), `allKeys` union, `resetPendingKeys`, `missingByTag` / `languages` filtering (skips static-only), `hasBaseline` per app, and `afterWrite` invoking `refreshRunningLocale`.

## Relationships

- **`src/modules/locales/composables/use-dictionary-aggregation.ts`** — the unit under test; imported directly and driven via its public API (`loadLanguage`, `cellState`, `entryAt`, `baselineAt`, `isMissing`, `allKeys`, `addPendingKey`, `resetPendingKeys`, `missingByTag`, `languages`, `hasBaseline`, `afterWrite`). The store and locale-overrides modules it depends on are both mocked in this file, so this spec isolates the composable's own logic without exercising those neighbors.

## Notes

- The mocking strategy is deliberate: `fetchBundledDictionary` resolves through `import.meta.glob` (a build-time concern), so mocking the transport layer would require faking two unrelated loaders. Faking the store methods is the narrowest sufficient boundary.
- `refreshRunningLocaleMock` is a module-level `vi.fn` that is **not** cleared in `beforeEach`. The single test that asserts on it uses `toHaveBeenCalledWith` (existence check), which is safe even if the mock accumulates calls across tests, but it means the mock is not strictly per-test state.
- The `afterWrite` test is intentionally a *contract* test — it proves the composable *requests* a running-locale refresh; the actual merge/re-derive logic lives in a separate spec (`locale-overrides.spec.ts`).
- `capabilities` and `apps` are reactive refs shared across all tests but never mutated per-test; they are treated as static registry data for the fixture build.
