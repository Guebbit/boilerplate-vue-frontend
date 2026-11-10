---
source: src/modules/locales/composables/use-dictionary-aggregation.ts
sha256: 01e28df67435926fcc8417e226691c6c5d49be609dfa328973b69d8303bd9636
signature: 805dcd91c05a871ef2cf6814ab9dc86168e28d713dc50114791bf56b8dbe476d
generated_at: 2026-11-10T04:39:29.729507+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/composables/use-dictionary-aggregation.ts

## Purpose

Composable that exposes a single, unified read model for the locales dictionary board. It merges three data sources—stored entries, the API's deployed baseline, and this build's bundled baseline—plus locally-added pending keys, into per-cell lookup functions. Consumers (the board view, the cell editor) always ask *this* composable "what is this cell?" instead of reading the raw sources, guaranteeing one consistent answer.

## Key elements

- **`useDictionaryAggregation(app: Ref<string>)`** — the sole export; a composable factory parameterised by the currently selected app id.
- **`appKind` / `hasBaseline`** — computeds derived from the app registry; determine which baseline (bundled vs. API) is readable for the selected app.
- **`languages`** — writable language columns (excludes `static`-only entries that have no entries collection).
- **`entriesIndex`** — per-language `Map<key, LocaleEntry>` for the selected app, computed from `entriesByTag`.
- **`baselines`** — the correct baseline map for the selected app (bundled for own app, API for backend apps, empty otherwise).
- **`entryAt`, `baselineAt`, `isMissing`, `cellState`** — per-cell lookup predicates used by the board and editor.
- **`allKeys`** — sorted union of all keys across entries, baselines, and `pendingKeys`.
- **`missingByTag`** — per-language count of missing cells (drives column badges/summaries).
- **`loadBoard` / `loadLanguage`** — data-loading entry points; call the locales store's fetch methods and populate the three source refs.
- **`afterWrite`** — post-write refresh: reloads the column, refreshes the manifest counts, and calls `refreshRunningLocale`.
- **`addPendingKey` / `resetPendingKeys`** — manage keys typed on the page but not yet persisted; reset on app switch.

## Relationships

- **`src/modules/locales/store.ts`** — primary data source; the composable calls `fetchAllEntries`, `fetchApiDictionary`, `fetchBundledDictionary`, `fetchApps`, `fetchLanguages` on the Pinia store and reads `capabilities` / `apps` / `ownApp` reactively.
- **`src/modules/locales/views/LocalesDictionary.vue`** — the board view that calls `useDictionaryAggregation` and reads the returned cell-state functions, `allKeys`, `missingByTag`, etc.
- **`src/modules/locales/tests/use-dictionary-aggregation.spec.ts`** — unit tests for the composable's computed logic and load/refresh flows.
- **`tests/cross-cutting/module-map.spec.ts`** — cross-cutting test that asserts module boundaries and dependency invariants this file must satisfy.
- **`src/infrastructure/utils/logger.ts`** — the composable calls `notifyErrorMessages` on load failures; error surfacing is routed through the infrastructure logger/notifications pipeline via `@guebbit/vue-toolkit`'s `useNotificationsStore`.

## Notes

- The composable is **read-model only**: it never writes entries itself. Writes are performed by the caller (cell editor); the caller then invokes `afterWrite` to trigger the refresh cycle.
- `app` is passed in as a `Ref<string>` owned by the caller. Switching apps is a page-level action with side effects (page reset, draft clearing) that this composable deliberately does not handle.
- `pendingKeys` are **not** persisted and **not** shared across apps; `resetPendingKeys` is expected to be called on app switch.
- `languages` filters out `static`-source languages because they have no entries collection to write into—this is a domain constraint, not a bug.
- The composable depends on `@guebbit/vue-toolkit`'s `useNotificationsStore` for toast dispatch; it does not create its own notification channel.
