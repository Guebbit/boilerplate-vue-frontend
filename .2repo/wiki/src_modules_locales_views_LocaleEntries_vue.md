# src/modules/locales/views/LocaleEntries.vue

## Purpose

Route view for `/locales/:tag` that displays, searches, and edits the translation entries for a single language. It drives the locales store's paginated search, provides inline value editing (save-on-blur), add/delete/import/export operations, and after every write refreshes the running app's live dictionary so the admin sees their edit immediately without a page reload.

## Key elements

- **`tag` (computed)** — reads `:tag` from the route params; the identity of the language whose entries this page manages.
- **`handleValueBlur`** — saves a single row's value on blur if the draft actually differs from the stored value; shows a brief check-mark on the row instead of a toast.
- **`handleAdd` / `handleDelete` / `handleImport`** — write operations that call the locales store, then call `search(true)` + `applyLiveOverrides()` (and `fetchLanguages()` for import) to refresh both the page and the running app's dictionary.
- **`handleExport`** — fetches *all* entries via `fetchAllEntries`, expands them into nested JSON with `expandEntries`, and triggers a client-side blob download as `<tag>.json`.
- **`applyLiveOverrides`** — calls `fetchLocaleOverrides` → `applyDictionary` (the same merge path used at boot); always resolves (errors are swallowed) so a live-refresh failure never turns a saved edit into an error toast.
- **`pageItems` (computed)** — filters the sparse pagination array from the toolkit so only real `LocaleEntry` objects reach the table.
- **`tenantChoice` (computed get/set)** — maps between the store's `undefined`-means-no-filter convention and the Vuetify select's requirement for a concrete sentinel value (`''`).
- **`savedRows` / `drafts`** — local reactive maps tracking transient per-row UI state (just-saved flash, pending edit text) without polluting the store.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — listed as a graph neighbor; no direct import or call is visible in the available (truncated) source.
- **`@/modules/locales/store.ts`** — primary data source; all CRUD and pagination flows go through `localesStore`.
- **`@/infrastructure/i18n` / `locale-overrides.ts`** — `applyDictionary` and `fetchLocaleOverrides` are the live-refresh path.
- **`@/modules/locales/dictionaries.ts`** — `expandEntries` converts flat/dotted entries into the nested JSON shape used by export.
- **`@/modules/locales/components/EntryFormDialog.vue` / `EntriesImportDialog.vue`** — modal sub-components for add and batch import.

## Notes

- The sparse pagination array from the toolkit contains `undefined` holes; the `pageItems` computed filters them out. The eslint-disable comment warns that the type assertion alone is insufficient at runtime.
- The tenant filter uses a `''` sentinel rather than `undefined` because Vuetify interprets a missing `value` as "use the title string," which would send the label to the API.
- Keys are rendered **disabled** in the table: changing a key is semantically a delete + add, and the API rejects an in-place key rename.
- `filters.value.tag` is set *before* `watchSearchEntries` is called (immediate) so the first search fires with the correct tag in the cache key.
- Import in `merge` mode asserts `removed === 0`; a non-zero value triggers a visible error message (contract violation), not a silent pass.
- The file is truncated in the source; the template's action-cell slots and the import/export dialog wiring are not fully visible.
