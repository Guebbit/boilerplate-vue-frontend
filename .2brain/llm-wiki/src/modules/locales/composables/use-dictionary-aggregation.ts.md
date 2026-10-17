---
source: src/modules/locales/composables/use-dictionary-aggregation.ts
sha256: 01e28df67435926fcc8417e226691c6c5d49be609dfa328973b69d8303bd9636
generated_at: 2026-10-17T01:03:25.623513+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/composables/use-dictionary-aggregation.ts

## Purpose

Composable that builds and owns the dictionary board's read model. It merges three data sources (stored entries, the API's deployed baseline, the bundled baseline) plus locally-added pending keys into a single per-cell lookup surface, so the board view and the cell editor always ask one place "what is this cell?" instead of reading the raw sources independently.

## Key elements

- **`useDictionaryAggregation(app: Ref<string>)`** — the sole export; receives a reactive app-id ref and returns the full board API.
- **`appKind` / `hasBaseline`** — computed flags that decide which baseline (bundled vs. API) is visible for the selected app.
- **`languages`** — writable language columns (excludes `static`-only entries that have no writable record).
- **`entriesIndex`** — per-language `Map<key, LocaleEntry>` filtered to the current app.
- **`baselines`** — the appropriate baseline record (bundled or API) for the current app, or `{}` if neither applies.
- **`entryAt` / `baselineAt` / `isMissing` / `cellState`** — per-cell lookup helpers; `cellState` returns `'entry' | 'baseline' | 'missing'` for display styling.
- **`allKeys`** — sorted union of all entry keys, baseline keys, and pending keys across every language.
- **`missingByTag`** — per-language count of keys with no entry and no baseline.
- **`loadBoard`** — fetches apps + languages, then every writable language's column in parallel; surfaces errors via the notifications store.
- **`loadLanguage(tag)`** — refetches one language's entries and both baselines.
- **`afterWrite(tag)`** — post-mutation refresh: reloads the column, refreshes manifest counts, and calls `refreshRunningLocale`.
- **`addPendingKey` / `resetPendingKeys`** — tracks keys added on the page but not yet saved; reset on app switch.

## Relationships

- **`src/modules/locales/store.ts`** — Primary data source. The composable calls `fetchApps`, `fetchLanguages`, `fetchAllEntries`, `fetchApiDictionary`, `fetchBundledDictionary`, and reads `ownApp` from the locales Pinia store. All board data flows through this store.
- **`src/modules/locales/views/LocalesDictionary.vue`** — Consumer. The dictionary board view calls `useDictionaryAggregation` and renders using the returned computed values and lookup functions.
- **`src/modules/locales/tests/use-dictionary-aggregation.spec.ts`** — Unit test suite covering the composable's aggregation logic, cell-state derivation, and load/refresh cycles.

## Notes

- `app` is a `Ref` owned by the caller; the composable does **not** reset pagination, drafts, or other page-level state on app switch — the caller must call `resetPendingKeys()` and handle any additional teardown.
- `hasBaseline` is `false` for a frontend app that isn't the running build *and* isn't a backend app; in that case `baselines` resolves to `{}` and every cell can only be `'entry'` or `'missing'`.
- `pendingKeys` is intentionally unsorted and append-only; ordering is handled by `allKeys`'s `.toSorted()`.
- `afterWrite` calls `refreshRunningLocale` (from `@/infrastructure/locale-overrides`), which is a side-effect beyond data loading — callers should be aware it may trigger a hot-reload of the running locale.
- Error handling is centralized in `loadBoard`'s `.catch`; individual `loadLanguage` calls do not catch errors, so an unhandled rejection there will propagate to the caller.
