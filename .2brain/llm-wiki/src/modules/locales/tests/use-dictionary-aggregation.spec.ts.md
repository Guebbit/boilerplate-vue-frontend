---
source: src/modules/locales/tests/use-dictionary-aggregation.spec.ts
sha256: f832a9fc2188d784177968f0482f1a3fd7b4f5706fdfbfbe6ea0a1a972abca16
generated_at: 2026-10-17T01:06:25.497176+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/tests/use-dictionary-aggregation.spec.ts

## Purpose

Vitest spec for the `useDictionaryAggregation` composable. It drives the composable's lookup and state logic (entry vs. baseline vs. missing, app-specific baseline sourcing, key union, pending-key lifecycle, missing counts, and the `afterWrite` refresh call) by faking the `useLocalesStore` with plain reactive variables rather than mocking the transport layer.

## Key elements

- **`vi.mock('../store.ts', …)`** — Replaces `useLocalesStore` with an object whose three fetch functions (`fetchAllEntries`, `fetchApiDictionary`, `fetchBundledDictionary`) resolve with module-level `let` variables (`entriesAnswer`, `apiBaselineAnswer`, `appBaselineAnswer`) that each test reassigns. Also exposes `capabilities`, `apps`, `ownApp`, and `loading` as reactive refs.
- **`vi.mock('@/infrastructure/locale-overrides.ts', …)`** — Replaces `refreshRunningLocale` with a `vi.fn()` so tests can assert it was called with the correct locale tag without exercising the real merge pipeline.
- **`entry(key, value, app?)`** — Helper that builds a `LocaleEntry` fixture row.
- **`beforeEach`** — Activates a fresh Pinia instance and resets all three answer variables to empty defaults.
- **`describe('useDictionaryAggregation')`** — Ten `it` blocks covering:
  - Entry takes priority over baseline (`cellState` → `'entry'`)
  - Un-overridden bundled key resolves as baseline
  - Key with neither entry nor baseline is missing
  - Backend app reads the API dictionary, not the bundled one
  - Third-party app (not own, not backend) gets no baseline at all
  - `allKeys` unions entry keys, baseline keys, and pending keys
  - `resetPendingKeys` clears only pending keys
  - `missingByTag` counts independently per writable language, skipping static-only
  - `hasBaseline` is `true` for own and backend apps, `false` otherwise
  - `afterWrite` calls `refreshRunningLocale` with the target locale

## Relationships

- **`src/modules/locales/composables/use-dictionary-aggregation.ts`** — The unit under test; every assertion in this file exercises that composable's public API (`loadLanguage`, `cellState`, `entryAt`, `baselineAt`, `isMissing`, `allKeys`, `addPendingKey`, `resetPendingKeys`, `missingByTag`, `languages`, `hasBaseline`, `afterWrite`).
- **`../store.ts`** (mocked) — The Pinia store the composable reads from; the mock here substitutes its three fetch methods and reactive state.
- **`@/infrastructure/locale-overrides.ts`** (mocked) — The `refreshRunningLocale` function the composable calls in `afterWrite`; this spec only verifies the call, not the merge.

## Notes

- The module-level comment explains *why* the store is faked directly: `fetchBundledDictionary` goes through `import.meta.glob` and `fetchApiDictionary` through `orvalMutator`; faking the store's return values is the minimal boundary that avoids mocking two unrelated loaders.
- The `refreshRunningLocale` mock deliberately does **not** test the actual dictionary merge (bundle + overrides re-derived). That pipeline belongs to `locale-overrides.spec.ts`; this file only proves the composable *requests* the refresh.
- Test bodies use `.then()` chains on the promise returned by `loadLanguage` rather than `async/await`, keeping them synchronous at the call site.
- `OWN_APP` and `BACKEND_APP` are hardcoded fixture ids (`'demo-fe'`, `'demo-be'`); the composable under test reads `store.ownApp` to determine which baseline source applies.
