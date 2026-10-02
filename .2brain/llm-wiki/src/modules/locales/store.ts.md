---
source: src/modules/locales/store.ts
sha256: 65a4863a5279258e54634a2338cf03f2f6218d81019ff7a06db1c60ff219b483
generated_at: 2026-10-02T15:14:16.680830+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/store.ts

## Purpose

Pinia store that powers the translation-admin screen. It manages two distinct resources behind one `defineStore`: the language **capabilities manifest** (which languages exist, their names, direction, visibility, default/fallback) and one language's **translation entries** (paginated CRUD rows). The manifest half always refetches after a write because the API returns differently-shaped records for reads (`LocaleCapability`) vs. writes (`Language`); the entries half delegates to the shared `useStructureCrudApi` toolkit.

## Key elements

- **`useLocalesStore`** — the exported Pinia store. Exposes `capabilities`, `tenants`, `defaultLocale`, `fallbackLocale`, `ownTenant`, `backendTenant`, `tenantLabel`, `fetchLanguages`, `fetchTenants`, `createLanguage`, `editLanguage`, `removeLanguage`, `addEntry`, `editEntry`, plus the toolkit-driven entry list (`filters`, `loading`, `pageItemList`, `pageCurrent`, `pageTotal`, `watchSearchEntries`).
- **`LocaleEntriesFilters`** — interface for the entries search cache key (`tag`, `text`, `tenant`). `tag` is intentionally inside the filters object so the toolkit's per-key cache cannot cross-contaminate languages.
- **`fetchApiDictionary(tag)`** — fetches and flattens the API's deployed dictionary for one language (tier-1 / backend). Resolves `{}` on 404 (dynamic-only language).
- **`fetchBundledDictionary(tag)`** — flattens this build's bundled i18n dictionary for one language. Empty if the build doesn't ship that locale.
- **`invalidateEntrySearches()`** — calls `queryClient.invalidateQueries({ queryKey: [resourceKey, 'search'] })` to mark every cached entry-search page stale. Used after `addEntry` / bulk imports because those write into the cache directly and bypass the toolkit's automatic invalidation.
- **`addEntry` / `editEntry`** — explicit wrappers (not generic `createOne`) because every entry operation needs both the language `tag` and the row id. Each calls `addRecord` + `invalidateEntrySearches` to keep the paginated list consistent.
- **`createLanguage` / `editLanguage` / `removeLanguage`** — write through `fetchAny`, then call `fetchLanguages()` to reload the manifest before resolving the API's `Language` row.

## Relationships

- **`src/modules/locales/dictionaries.ts`** — imports `flattenDictionary`, used by both `fetchApiDictionary` and `fetchBundledDictionary` to turn nested dictionary objects into flat `key → value` maps.
- **`src/kernel/registry.ts`** — no direct import or call is visible in this file; the dependency-graph link is indirect (likely through the shared `queryClient` or the `@api` / `@types` barrel). No direct interaction to document here.

## Notes

- **Never patches the running app's i18n.** The store deliberately avoids touching `vue-i18n` state; reloading the visitor's visible strings is the view's responsibility (`applyLiveOverrides` in `LocaleEntries.vue`). Coupling the store to `i18n` would tie every importer to boot order.
- **409 on `addEntry` is rethrown untouched** so the view can display the server's collision explanation (both offending keys) verbatim.
- **`removeLanguage` depends on the API's 409 guard:** the server refuses deletion while the language is still active; the caller must deactivate first. The store does not soften that constraint.
- **`ownTenant`** comes from `localeTenant()` at module scope (build-time constant), while **`backendTenant`** is computed from the server-fetched registry. The two can differ; UI must not assume they are the same.
- All manifest writes go through `fetchAny` (TanStack Query) so concurrent calls de-duplicate; entry-search invalidation is manual because `addRecord` writes into the cache directly rather than through the toolkit's mutation path.
