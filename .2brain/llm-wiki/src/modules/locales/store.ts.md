---
source: src/modules/locales/store.ts
sha256: 3ce106d8c126bea09fb1cf64c7c89e9bf35aa7da43277b5a5f8a8af6d0571d4e
signature: 191e4f850dbe08ef3a7245eff810e71f9c7fa57c4d371f790ac538719b72897c
generated_at: 2026-11-10T04:41:42.572783+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/store.ts

## Purpose

Pinia store (`useLocalesStore`) that backs the translation-admin UI. It is deliberately split into two halves behind one `defineStore`: a small, non-paginated CRUD surface for the language manifest (list, create, edit, activate/deactivate) and a paginated, search-driven CRUD resource for one language's locale entries (powered by `useStructureCrudApi` from `@guebbit/vue-toolkit`). The store never touches the running app's live i18n dictionaries; applying overrides after an edit is the view's responsibility.

## Key elements

- **`useLocalesStore`** — the exported Pinia setup store. Exposes:
  - *Languages half*: `capabilities` (ref of `Language[]`), `defaultLocale`, `fallbackLocale`, `apps` (ref of `LocaleAppDescriptor[]`), `ownApp`, `backendApp` (computed), and write wrappers `fetchLanguages`, `fetchLanguage`, `createLanguage`, `editLanguage`, `activateLanguage`, `deactivateLanguage`, each of which folds the API response into `capabilities` via `upsertLanguage` (tag-sorted upsert).
  - *Entries half*: the full `useStructureCrudApi` slice (`filters`, `pageItemList`, `loading`, `addRecord`, `deleteTarget`, `watchSearchEntries`, etc.) keyed on `resourceKey: 'locales'` and the shared `queryClient`.
  - **`invalidateEntrySearches`** — manually invalidates every cached search page (`[resourceKey, 'search']` prefix) after bulk writes that bypass the toolkit's automatic list invalidation.
  - **`fetchApps`** — loads the app registry; **`appLabel`** — resolves an app id to a display name.
  - **`listEntriesOf`** — routes to `listAppLocaleEntries` or `listLocaleEntries` depending on whether an app filter is set (the API encodes the app in the path).
- **`LocaleEntriesFilters`** — exported interface for the entries search. `tag` lives *inside* this object on purpose so the toolkit's cache key changes when the language changes.
- **`fetchApiDictionary`** / **`fetchBundledDictionary`** — internal helpers that flatten the API-deployed or frontend-bundled dictionary for one language into a `Record<string, string>`. Both resolve to `{}` on 404/absence rather than rejecting.

## Relationships

- **`src/modules/locales/dictionaries.ts`** — imports `flattenDictionary` and the `DictionaryRow` type used by both dictionary-fetching helpers.
- **`src/modules/locales/views/LocaleEntries.vue`** — consumes the entries half of the store; the file's own docs call out that this view owns `applyLiveOverrides` (re-applying i18n overrides after an edit).
- **`src/modules/locales/views/LocalesList.vue`**, **`LocalesDictionary.vue`**, **`EntityTranslations.vue`** — consume the languages and/or entries halves for their respective screens.
- **`src/modules/locales/composables/use-dictionary-aggregation.ts`**, **`use-dictionary-cell-editor.ts`** — read store state (filters, page items, dictionary data) to build dictionary-level UI.
- **`src/modules/locales/tests/store.spec.ts`**, **`languages-list-actions.spec.ts`**, **`confirm-once.spec.ts`** — unit-test the store's language CRUD and entry-search behavior.
- **`src/kernel/registry.ts`** — part of the module/registration layer that this store lives under.

## Notes

- Writes into the language list are **not** refetched: each wrapper folds the API's single-row response into `capabilities` via `upsertLanguage`, which replaces by tag and re-sorts. No extra round-trip.
- The entries half has **no generic `createOne`/`updateOne`** from the toolkit because every entry operation requires the language `tag` in addition to the row id; all writes are explicit wrappers.
- `addRecord` and bulk-import paths write directly into the TanStack Query cache and therefore skip the toolkit's automatic list invalidation — callers must invoke `invalidateEntrySearches` to keep an active `watchSearchEntries` in sync.
- The store intentionally **does not** import or mutate the app's live `i18n` instance. Coupling the store to i18n would tie every importer to boot order; the view handles live-overlap application.
- `LocaleEntriesFilters.tag` must stay inside the filters object; moving it to a separate ref would let the toolkit serve a cached page from one language to another when only the text filter matches.
