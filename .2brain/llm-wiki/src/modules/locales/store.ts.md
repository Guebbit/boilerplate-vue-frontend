---
source: src/modules/locales/store.ts
sha256: b74e8729d380d13e3d038f91b96b4c7e3b494c017860f006142c2d52a7b51a6c
generated_at: 2026-10-17T01:04:50.690479+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/store.ts

## Purpose

Pinia store that powers the translation-admin UI. It is deliberately split into two halves behind a single `defineStore` setup function: (1) language **capabilities** — reading the merged manifest and wrapping every write in an explicit refetch — and (2) one language's **entries** — a standard paginated CRUD resource driven by the `useStructureCrudApi` toolkit composable. The split exists because the API returns two different record shapes (`LocaleCapability` vs. `Language`), making a single generic CRUD resource impossible.

## Key elements

- **`LocaleEntriesFilters`** (exported interface) — search criteria (`tag`, `text`, `app`) for the entries half. `tag` is intentionally inside the filters object so the toolkit's cache key distinguishes languages; keeping it out would let two languages serve each other's cached pages.
- **`useLocalesStore`** (exported, `defineStore('locales', …)`) — the store itself. Exposes:
  - *Entries half:* `filters`, `loading`, `pageCurrent`, `pageSize`, `entriesPageTotal`, `pageItemList`, `watchSearchEntries`, `addRecord`, `deleteTarget`, `fetchAny`, and CRUD wrappers (`addEntry`, `editEntry`, `removeEntry`, bulk/merge/replace operations, entity-translation upsert).
  - *Capabilities half:* `capabilities`, `apps`, `ownApp`, `backendApp`, `appLabel(id)`, `defaultLocale`, `fallbackLocale`, and write wrappers `fetchLanguages`, `fetchApps`, `createLanguage`, `editLanguage`, `removeLanguage` — each write refetches the manifest.
  - **`invalidateEntrySearches()`** — manual `queryClient.invalidateQueries([resourceKey, 'search'])` used after cache-mutating writes (`addRecord`, bulk import) that bypass the toolkit's automatic invalidation.
- **`fetchApiDictionary(tag)`** (internal) — fetches and flattens the API's deployed dictionary for a tag; resolves `{}` on 404 (dynamic-only language is normal).
- **`fetchBundledDictionary(tag)`** (internal) — flattens this build's bundled dictionary for a tag; never rejects.
- **`listEntriesOf(tag, app, query)`** (internal) — routes to `listAppLocaleEntries` or `listLocaleEntries` depending on whether an app is scoped.

## Relationships

- **`src/modules/locales/dictionaries.ts`** — imports `flattenDictionary`, used by both internal dictionary fetchers to normalise nested message objects into flat `key → value` maps.
- **`src/modules/locales/views/LocaleEntries.vue`** — consumes the entries half (filters, pagination, CRUD wrappers). The store's JSDoc explicitly delegates live-dictionary reloading to this view's `applyLiveOverrides` helper so the store never touches the running app's `i18n` instance.
- **`src/modules/locales/views/LocalesList.vue`** — consumes the capabilities half (language list, create/edit/remove wrappers, manifest state).
- **`src/modules/locales/views/LocalesDictionary.vue`** and **`EntityTranslations.vue`** — consume the store's dictionary helpers and entity-translation API wrappers.
- **`src/modules/locales/tests/store.spec.ts`** — unit-tests the store's write-then-refetch contract and cache-invalidation behaviour.
- **`@/infrastructure/query-client.ts`** — the shared `sharedQueryClient` instance is passed into `useStructureCrudApi`, giving the store a single source of truth for query-cache keys across the app.
- **`@/infrastructure/locale-overrides.ts`** — provides `localeApp()` so the store knows which app id belongs to the running frontend (used for `ownApp`).

## Notes

- **Write-then-refetch, not patch.** Every capabilities write (`createLanguage`, `editLanguage`, `removeLanguage`) calls `fetchLanguages()` after the mutation instead of splicing the returned `Language` row into the `LocaleCapability[]` list, because the two shapes are incompatible.
- **Cache invalidation is manual for adds/imports.** `addRecord` and bulk imports write directly into the TanStack cache; they do not go through a toolkit `create` hook, so the store calls `invalidateEntrySearches()` by hand. The `[resourceKey, 'search']` key prefix targets only search pages, leaving `fetchAny`-cached manifest entries untouched.
- **No `i18n` coupling.** The store deliberately never mutates the running app's dictionaries. Live reloading after an edit is the view's responsibility to avoid coupling every import of this module to i18n boot order.
- **`tag` in filters is a cache-key design decision.** Removing it from `LocaleEntriesFilters` into a separate ref would cause cross-language cache collisions in the toolkit.
- **404 on dictionary fetch is expected.** A freshly added language has no deployed file; `fetchApiDictionary` swallows the error and returns `{}`.
- **Deletion guard is server-side.** `removeLanguage` relies on the API's 409 response (language still active) rather than enforcing a two-step deactivation→deletion sequence in the store.
