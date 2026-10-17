---
source: src/modules/locales/views/LocaleEntries.vue
sha256: da3d058b18ac8fde81a6e2267e6ee591c51ab00b6130a431d2217ce2fb35b487
generated_at: 2026-10-17T01:07:16.531753+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/views/LocaleEntries.vue

## Purpose

Route view for a single language's translation entries (reached via `/locales/:tag`). It drives a paginated, filterable table of flat key/value rows, supports inline value editing on blur, add-entry and bulk-import dialogs, and deletion. Every successful write also refreshes the currently running app's dictionary so the admin sees the change immediately without a page reload.

## Key elements

- **`handleSearch`** – Applies the text and app filters, resets to page 1, and triggers the store's `watchSearchEntries`.
- **`handleAdd(fields)`** – Writes one new entry via the store; on success closes `EntryFormDialog`, fires a toast, re-searches, and calls `refreshRunningLocale`. On failure delegates to the dialog's `applyServerErrors` or the local `addError` blocker.
- **`handleValueBlur(entry)`** – Compares the `drafts` ref against the stored value; if changed, saves via `localesStore.editEntry`, flashes a transient check mark on the row (1.5 s), and refreshes the running locale.
- **`handleDelete(entry)`** – Shows a confirm dialog, then removes the entry via the store, re-searches, and refreshes the running locale.
- **`handleImport(payload)`** – Submits the import dialog's parsed rows (merge or replace mode) through the store; on success closes the dialog, toasts the result, re-searches, and refreshes the running locale.
- **`tableHeaders`** (computed) – Localized column definitions for the `DataTable`; the `actions` column is `synthetic: true` (rendered via slot, not a row field).
- **`appChoice` / `appFilterOptions`** – Computed pair that maps the "all apps" sentinel (`''`) to/from `undefined` in the store's `filters.app`.
- **`rowActionSize`** – `useTouchFriendlySize()` result; yields `small` on desktop, default size on small viewports for WCAG touch targets.
- **`drafts` / `savedRows`** (refs) – Per-row-id local state: `drafts` captures the in-progress value for blur comparison; `savedRows` marks rows whose save just landed for the ephemeral check icon.
- **`addError`, `importError`, `rowActionError`** – Three independent `useBlockingError` instances that keep their respective dialogs/tables open and display the failure inline.
- **Named-component block (`LocaleEntriesPage`)** – Separate `<script>` (non-setup) that sets the component name for `<KeepAlive>` and devtools, since `<script setup>` cannot.

## Relationships

- **`src/modules/locales/store.ts`** – Primary data source. All CRUD operations (`addEntry`, `editEntry`, `removeEntry`, `importEntries`) and the search machinery (`watchSearchEntries`, `fetchLanguages`, `fetchApps`) are consumed from `useLocalesStore`. Reactive state (`capabilities`, `apps`, `filters`, `pageItemList`, `pageCurrent`, `entriesPageTotal`, `loading`) is pulled via `storeToRefs`.
- **`src/modules/locales/components/EntryFormDialog.vue`** – Rendered in the page; its `open` state is driven by `entryFormOpen`. On save the page calls `handleAdd` with the dialog's validated fields; on failure the page calls back into the dialog's `applyServerErrors` to map field-level errors.
- **`src/modules/locales/components/EntriesImportDialog.vue`** – Rendered in the page; its `open` state is driven by `importOpen`. On confirm the page calls `handleImport` with the dialog's parsed payload; on failure the `importError` blocker keeps the dialog open.
- **`src/modules/locales/dictionaries.ts`** – `expandEntries` is imported (used to shape entry data for display or downstream processing).

## Notes

- **`filters.tag` is set synchronously before the first search fires.** The tag is injected into the store's `filters` object on mount and on every `tag` change (immediate), so the search cache key always includes it. Do not remove the initial assignment.
- **The "all apps" sentinel is `''`, not `undefined`.** Vuetify treats a select item with no `value` as "use the title as the value," which would send the label string to the API. The computed `appChoice` translates between `''` (UI) and `undefined` (store).
- **Keys are read-only in the table.** Changing a key is semantically a delete + add, which the API enforces; the UI disables the key cell to prevent the shortcut.
- **Row-save feedback is a row-local check mark, not a toast.** A toast per edit would spam during bulk manual work; the `savedRows` map + 1.5 s timeout keeps feedback quiet.
- **Three separate blocking-error states exist** (add, import, row-action) because each has a different visual anchor (dialog slot vs. inline alert above the table). They must not be merged into one.
