# src/modules/locales/store.ts

## Purpose

Pinia store that manages the translation admin surface: the language manifest (which languages exist, their direction, visibility, and tier) on one side, and a single language's translation entries (paginated CRUD) on the other. It exists because the API answers with two differently-shaped records (`LocaleCapability` vs `Language`), so a single generic CRUD resource would not work; the store wraps both behind one `defineStore` setup function.

## Key elements

- **`useLocalesStore`** — the exported Pinia store (`'locales'`). Exposes `capabilities`, `tenants`, `defaultLocale`, `fallbackLocale`, `ownTenant`, `backendTenant`, `tenantLabel`, plus the CRUD action set below.
- **`LocaleEntriesFilters`** — exported interface (`tag`, `text`, `tenant`). `tag` is intentionally inside the filters object so the toolkit's search cache is keyed per-language, preventing cross-language cache collisions.
- **`fetchApiDictionary(tag)`** — fetches and flattens the API's deployed dictionary for one language (tier 1). Resolves to `{}` on 404 (a language with no file yet is normal).
- **`fetchBundledDictionary(tag)`** — flattens this frontend build's bundled dictionary for one language. Never rejects.
- **`fetchLanguages()` / `fetchTenants()`** — load the manifest and tenant registry into reactive refs.
- **`createLanguage` / `editLanguage` / `removeLanguage`** — dynamic-tier writes; each refetches the manifest afterward rather than splicing the returned `Language` row into `capabilities`.
- **`addEntry` / `editEntry` / `removeEntry`** — per-language entry CRUD. Explicit wrappers (not the toolkit's generic `createOne` family) because every call needs both the language tag and the row id.
- **`entriesPageTotal`** — local ref fed by the server's `meta.totalPages`, deliberately not the toolkit's `pageTotal` (which would over-count after visiting multiple languages in one session).

## Relationships

- **`src/modules/locales/dictionaries.ts`** — provides `flattenDictionary`, used by both `fetchApiDictionary` and `fetchBundledDictionary` to convert nested dictionary objects into a flat `key → value` map before storing them as display data.

## Notes

- The store deliberately does **not** touch the running app's `i18n` instance. Live-reloading visitor-visible translations after an edit is the view's job (`applyLiveOverrides` in `LocaleEntries.vue`), keeping this module free of boot-order coupling.
- Every language-level write (`createLanguage`, `editLanguage`, `removeLanguage`) refetches the entire manifest. The returned `Language` row has a different shape from `LocaleCapability`, so local splicing is not attempted.
- `addEntry` calls `resetSearches()` after the server responds because the new row's page position is server-determined and all cached pages may be stale.
- `removeLanguage` relies on the API's 409 guard (refuses while the language is still active); the store does not soften that two-step deactivation-then-delete flow.
- `bulkImport` (truncated in the listing) exposes `merge` and `replace` as named modes rather than a boolean, mapping 1:1 to the HTTP methods to prevent accidental inversion.
