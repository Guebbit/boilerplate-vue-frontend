# src/modules/locales/store.ts

## Purpose

Pinia store (setup-style) for the translation admin screen. It manages two distinct API resources behind one `defineStore`: the language manifest (capabilities across both tiers, read via `getLocales`, written via explicit wrappers that always refetch after a mutation) and one language's paginated translation entries (driven by `useStructureCrudApi`).

## Key elements

- **`useLocalesStore`** — the exported Pinia store. Contains state (`capabilities`, `tenants`, `defaultLocale`, `fallbackLocale`), computed properties (`backendTenant`, `tenantLabel`), and all CRUD actions.
- **`LocaleEntriesFilters`** — search criteria (`tag`, `text`, `tenant`). `tag` is deliberately inside this object so the toolkit's filter-keyed search cache treats a language switch as a filter change.
- **`fetchApiDictionary(tag)`** — fetches and flattens the API's deployed dictionary for a language (tier 1). Resolves `{}` on 404 (a dynamic-only language is normal, not an error).
- **`fetchBundledDictionary(tag)`** — flattens the frontend's bundled dictionary for a language. Empty for languages the build does not ship.
- **`fetchLanguages` / `fetchTenants`** — load the manifest and tenant registry respectively.
- **`createLanguage` / `editLanguage` / `removeLanguage`** — CRUD on the dynamic-tier language row; each calls `fetchLanguages()` after the write because the API returns a `Language`, not a `LocaleCapability`.
- **`addEntry` / `editEntry` / `removeEntry`** — CRUD on a single translation entry (requires `tag` + row id, so explicit wrappers rather than the generic `createOne` family). `addEntry` calls `resetSearches()` to invalidate cached pages.
- **`useStructureCrudApi`** usage — provides `filters`, `pageCurrent`, `pageItemList`, `watchSearchEntries`, etc. for the paginated entry search.
- **`useServerPageTotal`** — supplies the real `pageTotal` from `meta.totalPages`, shadowing the toolkit's local count (which is wrong because the cache spans every language visited this session).

## Relationships

- **`src/modules/locales/dictionaries.ts`** — provides `flattenDictionary`, used by both `fetchApiDictionary` and `fetchBundledDictionary` to collapse nested translation objects into flat `key → value` maps for display alongside entry rows.

## Notes

- The store intentionally does **not** touch the running app's i18n dictionaries; applying live overrides after an edit is the view's responsibility (`applyLiveOverrides` in `LocaleEntries.vue`).
- The toolkit's local `pageTotal` is unused (shadowed): it counts every language's rows in the session cache, producing phantom empty pages after browsing another language.
- `deleteLocale` returns 409 while the language is still active — that two-step (deactivate → delete) is enforced server-side and is not softened here.
- A 409 on `createLocaleEntry` carries the server's key-collision explanation and is rethrown untouched so the view can display it verbatim.
- Entry keys are immutable; changing a key is a delete + add, not an edit.
